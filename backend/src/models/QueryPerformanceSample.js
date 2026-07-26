const mongoose = require('mongoose');
const { CONSISTENCY_CLASSES, QUERY_OPERATION_TYPES } = require('../constants/dataAccessPerformance');

const categories = ['none', 'low', 'moderate', 'high', 'critical'];
const schema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    queryShapeId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    operationType: { type: String, required: true, enum: QUERY_OPERATION_TYPES, immutable: true },
    durationMs: { type: Number, required: true, min: 0, max: 3_600_000 },
    resultCount: { type: Number, required: true, min: 0, max: 10_000 },
    documentsExaminedCategory: { type: String, required: true, enum: categories },
    keysExaminedCategory: { type: String, required: true, enum: categories },
    examinationRatioCategory: { type: String, required: true, enum: categories },
    indexUsageCategory: { type: String, required: true, enum: ['expected_index', 'alternate_index', 'collection_scan', 'unknown'] },
    expectedIndexName: { type: String, trim: true, maxlength: 200 },
    usedIndexName: { type: String, trim: true, maxlength: 200 },
    cacheOutcome: { type: String, required: true, enum: ['cache_hit', 'cache_miss', 'cache_bypass', 'cache_unavailable', 'not_applicable'] },
    consistencyClass: { type: String, required: true, enum: Object.values(CONSISTENCY_CLASSES) },
    timeoutCategory: { type: String, required: true, enum: ['none', 'operation_timeout', 'server_selection_timeout', 'pool_wait_timeout'] },
    success: { type: Boolean, required: true },
    safeFailureCode: { type: String, trim: true, maxlength: 128 },
    requestId: { type: String, trim: true, maxlength: 200 },
    traceId: { type: String, trim: true, maxlength: 200 },
    legalHoldProtected: { type: Boolean, required: true, default: false },
    sampledAt: { type: Date, required: true, default: Date.now, immutable: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, strict: 'throw' },
);

schema.index({ organizationId: 1, workspaceId: 1, sampledAt: -1 }, { name: 'dap_query_sample_scope_time' });
schema.index({ queryShapeId: 1, sampledAt: -1 }, { name: 'dap_query_sample_shape_time' });
schema.index({ safeFailureCode: 1, sampledAt: -1 }, { sparse: true, name: 'dap_query_sample_failure' });
schema.index({ indexUsageCategory: 1, sampledAt: -1 }, { name: 'dap_query_sample_index_use' });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { legalHoldProtected: false }, name: 'dap_query_sample_expiry' });

module.exports = mongoose.models.QueryPerformanceSample || mongoose.model('QueryPerformanceSample', schema);
