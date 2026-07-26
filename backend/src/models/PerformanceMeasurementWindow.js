const mongoose = require('mongoose');
const { BACKPRESSURE_STATES, DATABASE_PRESSURE_CATEGORIES } = require('../constants/productionScale');
const { HISTOGRAM_BUCKETS_MS, PERFORMANCE_LIMITS } = require('../constants/performanceCapacity');

const SAFE_CODE = /^[A-Z0-9][A-Z0-9_:-]{0,127}$/;
const category = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const count = { type: Number, required: true, min: 0, max: 1_000_000_000, default: 0 };

const histogramSchema = new mongoose.Schema(
  {
    buckets: {
      type: [{ type: Number, enum: HISTOGRAM_BUCKETS_MS }],
      default: [],
      validate: {
        validator: (items) => items.length <= PERFORMANCE_LIMITS.maximumHistogramBuckets
          && new Set(items).size === items.length
          && items.every((item, index) => index === 0 || items[index - 1] < item),
        message: 'Histogram buckets must be bounded and have unique upper bounds.',
      },
    },
    counts: { type: [{ type: Number, min: 0, max: 1_000_000_000 }], default: [], validate: (items) => items.length <= PERFORMANCE_LIMITS.maximumHistogramBuckets + 1 },
    count: count,
    sum: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 },
    maximum: { type: Number, required: true, min: 0, max: 2_592_000_000, default: 0 },
  },
  { _id: false, strict: 'throw' },
);

function validFailureCounts(value) {
  if (!(value instanceof Map) || value.size > 64) return false;
  return [...value.entries()].every(([key, item]) => SAFE_CODE.test(key) && Number.isInteger(item) && item >= 0 && item <= 1_000_000_000);
}
function boundedFairness(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 32 && entries.every(([key, item]) => category.test(key) && (typeof item === 'string' ? item.length <= 128 : Number.isFinite(item) && item >= 0 && item <= 1_000_000_000));
}

const schema = new mongoose.Schema(
  {
    performanceRunId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    windowStart: { type: Date, required: true, immutable: true },
    windowEnd: { type: Date, required: true, immutable: true },
    sequence: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumMeasurementWindows - 1, immutable: true },
    stage: { type: String, enum: ['warmup', 'steady_state', 'cooldown', 'analysis'], immutable: true },
    stageCategory: { type: String, enum: ['warmup', 'steady_state', 'cooldown', 'analysis'], immutable: true },
    requestCount: count,
    successCount: count,
    expectedRejectionCount: count,
    unexpectedFailureCount: count,
    timeoutCount: count,
    retryCount: count,
    latencyHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    queueWaitHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    executionHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    databaseHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    cacheHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    policyHistogram: { type: histogramSchema, required: true, default: () => ({}) },
    throughput: { type: Number, required: true, min: 0, max: 1_000_000, default: 0 },
    activeConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency, default: 0 },
    workerUtilizationCategory: { type: String, enum: ['idle', 'low', 'moderate', 'high', 'saturated', 'unknown'], required: true, default: 'unknown' },
    databasePressureCategory: { type: String, enum: DATABASE_PRESSURE_CATEGORIES, required: true, default: 'healthy' },
    cacheHealthCategory: { type: String, enum: ['healthy', 'degraded', 'unavailable', 'unknown'], required: true, default: 'unknown' },
    backpressureState: { type: String, enum: BACKPRESSURE_STATES, required: true, default: 'normal' },
    queueDepthCategory: { type: String, enum: ['none', 'low', 'moderate', 'high', 'critical', 'unknown'], required: true, default: 'unknown' },
    oldestQueueAgeCategory: { type: String, enum: ['fresh', 'elevated', 'stale', 'critical', 'unknown'], required: true, default: 'unknown' },
    tenantFairnessSummary: { type: mongoose.Schema.Types.Mixed, required: true, default: () => ({}), validate: { validator: boundedFairness, message: 'Tenant fairness summary must contain bounded categorical aggregates.' } },
    safeFailureCounts: { type: Map, of: Number, required: true, default: () => new Map(), validate: { validator: validFailureCounts, message: 'Safe failure counts must be bounded.' } },
  },
  { timestamps: true, strict: 'throw' },
);

schema.path('windowEnd').validate(function validateWindowEnd(value) { return value >= this.windowStart; }, 'windowEnd must not precede windowStart.');
for (const path of ['latencyHistogram', 'queueWaitHistogram', 'executionHistogram', 'databaseHistogram', 'cacheHistogram', 'policyHistogram']) {
  schema.path(path).validate((histogram) => histogram.counts.length === 0 || histogram.counts.length === histogram.buckets.length + 1, 'Histogram counts must include one overflow bucket.');
}
schema.index({ performanceRunId: 1, sequence: 1 }, { unique: true, name: 'performance_window_run_sequence' });
schema.index({ performanceRunId: 1, windowStart: 1 }, { name: 'performance_window_run_start' });
schema.index({ createdAt: -1 }, { name: 'performance_window_created_at' });

module.exports = mongoose.models.PerformanceMeasurementWindow || mongoose.model('PerformanceMeasurementWindow', schema);
