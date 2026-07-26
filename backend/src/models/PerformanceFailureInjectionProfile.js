const mongoose = require('mongoose');
const { PERFORMANCE_LIMITS, PERFORMANCE_TEST_MODES } = require('../constants/performanceCapacity');

const INJECTION_CATEGORIES = [
  'synthetic_latency', 'synthetic_timeout', 'synthetic_transient_failure',
  'synthetic_rate_limit', 'synthetic_circuit_open', 'synthetic_worker_crash',
  'synthetic_lease_expiry', 'synthetic_cache_unavailable', 'synthetic_database_delay',
  'synthetic_projection_lag', 'synthetic_region_unavailable',
  'synthetic_replication_unknown', 'synthetic_agent_unavailable',
];
const SAFE_CODE = /^[A-Z0-9][A-Z0-9_:-]{0,127}$/;
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key)/i.test(String(value || ''));
const TEST_TARGET_CATEGORIES = ['test_adapter', 'mock_worker', 'mock_cache', 'mock_database', 'mock_projection', 'mock_region', 'mock_agent'];

const injectionRuleSchema = new mongoose.Schema(
  {
    category: { type: String, enum: INJECTION_CATEGORIES, required: true },
    probabilityBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    maximumInjectionCount: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumFixtureCount },
    delayMs: { type: Number, min: 0, max: PERFORMANCE_LIMITS.maximumDurationMs },
    afterRequestCount: { type: Number, min: 0, max: 1_000_000_000, default: 0 },
    targetCategory: { type: String, enum: TEST_TARGET_CATEGORIES, default: 'test_adapter' },
    safeReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE },
    enabled: { type: Boolean, required: true, default: true },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true, default: 'platform' },
    organizationId: { type: String, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: ['draft', 'active', 'archived'], required: true, default: 'draft' },
    allowedModes: { type: [{ type: String, enum: PERFORMANCE_TEST_MODES }], required: true, validate: (items) => items.length >= 1 && items.length <= PERFORMANCE_TEST_MODES.length },
    injectionRules: { type: [injectionRuleSchema], required: true, validate: (items) => items.length >= 1 && items.length <= 50 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: Date,
    archivedAt: Date,
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('scope').validate(function validateScope(scope) {
  if (scope === 'platform') return !this.organizationId && !this.workspaceId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  return Boolean(this.organizationId) && Boolean(this.workspaceId);
}, 'Failure-injection scope identifiers are inconsistent.');
schema.path('description').validate(SAFE_TEXT, 'Failure-injection descriptions must not contain credentials or connection data.');
schema.path('name').validate(SAFE_TEXT, 'Failure-injection names must not contain credentials or connection data.');
schema.path('allowedModes').validate((items) => !items.includes('production_observation_only'), 'Fault injection cannot be enabled for production observation.');
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, name: 1, version: 1 }, { unique: true, name: 'performance_failure_profile_name_version' });
schema.index({ status: 1 }, { name: 'performance_failure_profile_status' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'performance_failure_profile_idempotency' });

module.exports = mongoose.models.PerformanceFailureInjectionProfile || mongoose.model('PerformanceFailureInjectionProfile', schema);
