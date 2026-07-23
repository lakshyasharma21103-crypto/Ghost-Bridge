const mongoose = require('mongoose');
const { PERFORMANCE_LIMITS } = require('../constants/performanceCapacity');

const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function validEntityCounts(value) {
  if (!(value instanceof Map) || value.size > 64) return false;
  let total = 0;
  for (const [key, item] of value.entries()) {
    if (!SAFE_TOKEN.test(key) || !Number.isInteger(item) || item < 0 || item > PERFORMANCE_LIMITS.maximumFixtureCount) return false;
    total += item;
  }
  return total <= PERFORMANCE_LIMITS.maximumFixtureCount;
}

const schema = new mongoose.Schema(
  {
    fixtureSetId: { type: String, required: true, trim: true, match: SAFE_TOKEN, immutable: true },
    organizationId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    seed: { type: Number, required: true, min: 1, max: 2_147_483_647, immutable: true },
    status: { type: String, enum: ['preparing', 'ready', 'in_use', 'cleanup_pending', 'cleaned', 'cleanup_failed'], required: true, default: 'preparing' },
    entityCounts: { type: Map, of: Number, required: true, default: () => new Map(), validate: { validator: validEntityCounts, message: 'Fixture entity counts must be synthetic and bounded.' } },
    safeSizeCategory: { type: String, enum: ['tiny', 'small', 'medium', 'large'], required: true, default: 'small' },
    testOrigin: { type: Boolean, required: true, default: true, immutable: true },
    cleanupTag: { type: String, required: true, trim: true, match: SAFE_TOKEN, immutable: true },
    createdBy: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    cleanupStartedAt: Date,
    cleanedAt: Date,
    cleanupAttempt: { type: Number, required: true, min: 0, max: 100, default: 0 },
    safeFailureCode: { type: String, trim: true, maxlength: 128 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.index({ fixtureSetId: 1 }, { unique: true, name: 'performance_fixture_set_id' });
schema.index({ organizationId: 1, workspaceId: 1, status: 1 }, { name: 'performance_fixture_scope_status' });
schema.index({ scenarioId: 1 }, { name: 'performance_fixture_scenario' });
schema.index({ status: 1, createdAt: -1 }, { name: 'performance_fixture_cleanup_status' });
schema.index({ createdAt: -1 }, { name: 'performance_fixture_created_at' });

module.exports = mongoose.models.PerformanceFixtureSet || mongoose.model('PerformanceFixtureSet', schema);
