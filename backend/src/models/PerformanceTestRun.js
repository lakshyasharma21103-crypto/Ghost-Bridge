const mongoose = require('mongoose');
const {
  EVALUATION_STATES,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TEST_MODES,
  REGRESSION_STATES,
  RUN_STATUSES,
  TRAFFIC_MODELS,
  WORKLOAD_DOMAIN_IDS,
} = require('../constants/performanceCapacity');

const SAFE_CODE = /^[A-Z0-9][A-Z0-9_:-]{0,127}$/;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SENSITIVE = /(authorization|credential|secret|password|token|api.?key|install.?key|connection.?string|database.?uri|redis.?uri|raw.?request|raw.?response|hidden.?reasoning)/i;
const SENSITIVE_VALUE = /(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|private key)/i;
function boundedAggregate(value) {
  function visit(item, depth) {
    if (depth > 5) return false;
    if (item === null || typeof item === 'boolean') return true;
    if (typeof item === 'number') return Number.isFinite(item) && Math.abs(item) <= Number.MAX_SAFE_INTEGER;
    if (typeof item === 'string') return item.length <= 512 && !SENSITIVE_VALUE.test(item);
    if (Array.isArray(item)) return item.length <= 128 && item.every((entry) => visit(entry, depth + 1));
    if (!item || typeof item !== 'object') return false;
    const entries = Object.entries(item);
    return entries.length <= 64 && entries.every(([key, entry]) => /^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(key) && !SENSITIVE.test(key) && visit(entry, depth + 1));
  }
  try { return visit(value, 0) && Buffer.byteLength(JSON.stringify(value), 'utf8') <= 65_536; } catch (_error) { return false; }
}
const aggregate = () => ({ type: mongoose.Schema.Types.Mixed, default: () => ({}), validate: { validator: boundedAggregate, message: 'Summary must be bounded safe aggregate data.' } });
const count = { type: Number, required: true, min: 0, max: 1_000_000_000, default: 0 };
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
    organizationId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    budgetPolicyId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    budgetPolicyVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    baselineId: { type: String, trim: true, maxlength: 200, immutable: true },
    environmentFingerprintId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    mode: { type: String, enum: PERFORMANCE_TEST_MODES, required: true, immutable: true },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true, immutable: true },
    status: { type: String, enum: RUN_STATUSES, required: true, default: 'requested' },
    trafficModel: { type: String, enum: TRAFFIC_MODELS, required: true, immutable: true },
    targetId: { type: String, trim: true, maxlength: 200, match: SAFE_IDENTIFIER, immutable: true },
    configuredDurationMs: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumDurationMs, immutable: true },
    actualDurationMs: { type: Number, min: 0, max: 2_592_000_000 },
    targetConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency, immutable: true },
    achievedConcurrency: { type: Number, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency },
    targetRequestsPerSecond: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumRequestsPerSecond, immutable: true },
    achievedRequestsPerSecond: { type: Number, min: 0, max: 1_000_000 },
    requestCount: count,
    successfulRequestCount: count,
    expectedRejectionCount: count,
    overloadRejectionCount: count,
    quotaRejectionCount: count,
    unexpectedFailureCount: count,
    timeoutCount: count,
    retryCount: count,
    cancelledCount: count,
    unknownOutcomeCount: count,
    correctnessViolationCount: count,
    securityViolationCount: count,
    errorRateBasisPoints: { type: Number, min: 0, max: 10_000 },
    outcomeCounts: { type: Map, of: Number, default: () => new Map(), validate: (value) => value.size <= 32 && [...value.values()].every((item) => Number.isInteger(item) && item >= 0 && item <= 1_000_000_000) },
    latencyPercentiles: { type: percentileSchema, default: () => ({}) },
    throughputSummary: aggregate(),
    queueSummary: aggregate(),
    workerSummary: aggregate(),
    databaseSummary: aggregate(),
    cacheSummary: aggregate(),
    fairnessSummary: aggregate(),
    recoverySummary: aggregate(),
    regionalSummary: aggregate(),
    budgetEvaluationStatus: { type: String, enum: EVALUATION_STATES },
    regressionEvaluationStatus: { type: String, enum: REGRESSION_STATES },
    safeFailureCodes: { type: [{ type: String, trim: true, match: SAFE_CODE }], default: [], validate: (items) => items.length <= 64 },
    safeWarnings: { type: [{ type: String, trim: true, maxlength: 256 }], default: [], validate: (items) => items.length <= 64 },
    fixtureSetId: { type: String, trim: true, maxlength: 200 },
    cleanupStatus: { type: String, enum: ['not_required', 'pending', 'in_progress', 'completed', 'failed', 'cleanup_pending', 'cleaned', 'cleanup_failed'], default: 'not_required' },
    approvalRequestId: { type: String, trim: true, maxlength: 200 },
    incidentId: { type: String, trim: true, maxlength: 200 },
    requestId: { type: String, trim: true, maxlength: 200, immutable: true },
    traceId: { type: String, trim: true, maxlength: 200, immutable: true },
    idempotencyKeyHash: { type: String, required: true, select: false, trim: true, maxlength: 80, immutable: true },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80, immutable: true },
    requestedBy: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('latencyPercentiles').validate((value) => {
  const values = [value.p50Ms, value.p90Ms, value.p95Ms, value.p99Ms, value.maximumMs];
  if (values.every((item) => item === undefined || item === null)) return true;
  return values.every((item) => Number.isFinite(item))
    && value.p50Ms <= value.p90Ms
    && value.p90Ms <= value.p95Ms
    && value.p95Ms <= value.p99Ms
    && value.p99Ms <= value.maximumMs;
}, 'Latency percentiles must be complete and monotonic.');
schema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, { name: 'performance_run_scope_status_created' });
schema.index({ scenarioId: 1, createdAt: -1 }, { name: 'performance_run_scenario_created' });
schema.index({ workloadDomain: 1, createdAt: -1 }, { name: 'performance_run_workload_created' });
schema.index({ budgetEvaluationStatus: 1 }, { name: 'performance_run_budget_status' });
schema.index({ regressionEvaluationStatus: 1 }, { name: 'performance_run_regression_status' });
schema.index({ requestId: 1 }, { partialFilterExpression: { requestId: { $type: 'string' } }, name: 'performance_run_request_id' });
schema.index({ traceId: 1 }, { partialFilterExpression: { traceId: { $type: 'string' } }, name: 'performance_run_trace_id' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'performance_run_idempotency' });

module.exports = mongoose.models.PerformanceTestRun || mongoose.model('PerformanceTestRun', schema);
