const mongoose = require('mongoose');
const { WORKLOAD_DOMAIN_IDS } = require('../constants/performanceCapacity');
const SENSITIVE = /(authorization|credential|secret|password|token|api.?key|install.?key|connection.?string|database.?uri|redis.?uri|raw.?request|raw.?response|hidden.?reasoning)/i;
const SENSITIVE_VALUE = /(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|private key)/i;
const SAFE_TEXT = (value) => !SENSITIVE_VALUE.test(String(value || '')) && !/(credential|secret|password|api.?key|provider.?account)/i.test(String(value || ''));

function boundedAggregate(value) {
  const seen = new Set();
  function visit(item, depth) {
    if (depth > 5) return false;
    if (item === null || typeof item === 'boolean') return true;
    if (typeof item === 'number') return Number.isFinite(item) && Math.abs(item) <= Number.MAX_SAFE_INTEGER;
    if (typeof item === 'string') return item.length <= 512 && !SENSITIVE_VALUE.test(item);
    if (typeof item !== 'object' || seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.length <= 128 && item.every((entry) => visit(entry, depth + 1));
    const entries = Object.entries(item);
    return entries.length <= 64 && entries.every(([key, entry]) => /^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(key) && !SENSITIVE.test(key) && visit(entry, depth + 1));
  }
  try { return visit(value, 0) && Buffer.byteLength(JSON.stringify(value), 'utf8') <= 65_536; } catch (_error) { return false; }
}

const aggregate = () => ({
  type: mongoose.Schema.Types.Mixed,
  default: () => ({}),
  validate: { validator: boundedAggregate, message: 'Aggregate summary must be bounded and contain safe scalar data.' },
});

const percentileSchema = new mongoose.Schema(
  {
    p50Ms: { type: Number, min: 0, max: 2_592_000_000 },
    p90Ms: { type: Number, min: 0, max: 2_592_000_000 },
    p95Ms: { type: Number, min: 0, max: 2_592_000_000 },
    p99Ms: { type: Number, min: 0, max: 2_592_000_000 },
    maximumMs: { type: Number, min: 0, max: 2_592_000_000 },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true, immutable: true },
    organizationId: { type: String, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, trim: true, maxlength: 200, immutable: true },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true, immutable: true },
    scenarioId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    baselineName: { type: String, required: true, trim: true, maxlength: 120, immutable: true },
    baselineVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    environmentFingerprintId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    softwareVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    protocolVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    schemaVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    migrationVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    routingVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    cacheSerializationVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    sampleSize: { type: Number, required: true, min: 1, max: 1_000_000_000, immutable: true },
    errorRateBasisPoints: { type: Number, min: 0, max: 10_000, immutable: true },
    regressionToleranceBasisPoints: { type: Number, min: 0, max: 10_000, immutable: true },
    absoluteRegressionToleranceMs: { type: Number, min: 0, max: 2_592_000_000, immutable: true },
    summaryMetrics: aggregate(),
    latencyPercentiles: { type: percentileSchema, required: true, immutable: true },
    throughputSummary: aggregate(),
    queueSummary: aggregate(),
    databaseSummary: aggregate(),
    cacheSummary: aggregate(),
    workerSummary: aggregate(),
    fairnessSummary: aggregate(),
    recoverySummary: aggregate(),
    regionalSummary: aggregate(),
    sourceRunId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    approvedBy: { type: String, trim: true, maxlength: 200 },
    approvedAt: Date,
    status: { type: String, enum: ['candidate', 'active', 'superseded', 'rejected', 'archived'], required: true, default: 'candidate' },
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80, immutable: true },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('scope').validate(function validateScope(scope) {
  if (scope === 'platform') return !this.organizationId && !this.workspaceId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  return Boolean(this.organizationId) && Boolean(this.workspaceId);
}, 'Baseline scope identifiers are inconsistent.');
schema.path('latencyPercentiles').validate((value) => value.p50Ms <= value.p90Ms && value.p90Ms <= value.p95Ms && value.p95Ms <= value.p99Ms && value.p99Ms <= value.maximumMs, 'Latency percentiles must be monotonic.');
for (const path of ['baselineName', 'softwareVersion', 'protocolVersion', 'schemaVersion', 'migrationVersion', 'routingVersion', 'cacheSerializationVersion']) {
  schema.path(path).validate(SAFE_TEXT, 'Performance baselines must not contain credentials or connection data.');
}

schema.index({ scope: 1, workloadDomain: 1, status: 1 }, { name: 'performance_baseline_scope_workload_status' });
schema.index({ scenarioId: 1, environmentFingerprintId: 1 }, { name: 'performance_baseline_scenario_environment' });
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, baselineName: 1, baselineVersion: 1 }, { unique: true, name: 'performance_baseline_name_version' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'performance_baseline_idempotency' });

module.exports = mongoose.models.PerformanceBaseline || mongoose.model('PerformanceBaseline', schema);
