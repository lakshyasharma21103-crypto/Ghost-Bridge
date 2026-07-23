const mongoose = require('mongoose');
const { REGRESSION_STATES } = require('../constants/performanceCapacity');
const SENSITIVE = /(authorization|credential|secret|password|token|api.?key|install.?key|connection.?string|database.?uri|redis.?uri|raw.?request|raw.?response|hidden.?reasoning)/i;
const SENSITIVE_VALUE = /(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|private key)/i;

function boundedChanges(value, depth = 0) {
  if (depth > 5) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 256 && !SENSITIVE_VALUE.test(value);
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  if (Array.isArray(value)) return value.length <= 128 && value.every((item) => boundedChanges(item, depth + 1));
  if (!value || typeof value !== 'object') return false;
  const entries = Object.entries(value);
  return entries.length <= 64 && entries.every(([key, item]) => /^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(key) && !SENSITIVE.test(key) && boundedChanges(item, depth + 1));
}
const changes = () => ({ type: mongoose.Schema.Types.Mixed, default: () => ({}), validate: { validator: boundedChanges, message: 'Regression changes must contain bounded aggregate values.' } });

const schema = new mongoose.Schema(
  {
    performanceRunId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    baselineId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    environmentCompatibility: { type: String, enum: ['compatible', 'incompatible', 'unknown'], required: true, immutable: true },
    sampleCompatibility: { type: Boolean, required: true, immutable: true },
    status: { type: String, enum: REGRESSION_STATES, required: true, immutable: true },
    latencyChanges: changes(),
    throughputChanges: changes(),
    errorRateChanges: changes(),
    queueChanges: changes(),
    databaseChanges: changes(),
    cacheChanges: changes(),
    workerChanges: changes(),
    fairnessChanges: changes(),
    recoveryChanges: changes(),
    regionalChanges: changes(),
    safeReasonCodes: { type: [{ type: String, trim: true, maxlength: 128 }], default: [], validate: (items) => items.length <= 64 },
    generatedAt: { type: Date, required: true, default: Date.now, immutable: true },
  },
  { timestamps: false, strict: 'throw' },
);

schema.index({ performanceRunId: 1 }, { unique: true, name: 'performance_regression_run' });
schema.index({ baselineId: 1 }, { name: 'performance_regression_baseline' });
schema.index({ status: 1 }, { name: 'performance_regression_status' });

module.exports = mongoose.models.PerformanceRegressionEvaluation || mongoose.model('PerformanceRegressionEvaluation', schema);
