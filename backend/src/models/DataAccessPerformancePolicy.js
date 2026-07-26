const mongoose = require('mongoose');
const { CACHE_NAMESPACES } = require('../constants/dataAccessPerformance');

const cacheNamespaces = CACHE_NAMESPACES.map((entry) => entry.namespace);
const safeMap = {
  type: mongoose.Schema.Types.Mixed,
  default: {},
  validate: {
    validator(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > cacheNamespaces.length) return false;
      return Object.entries(value).every(([key, item]) => cacheNamespaces.includes(key) && Number.isInteger(item) && item >= 1_000 && item <= 3_600_000);
    },
    message: 'Namespace TTL overrides must be bounded and allowlisted.',
  },
};

const schema = new mongoose.Schema(
  {
    organizationId: { type: String, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true },
    scopeKey: { type: String, required: true, trim: true, maxlength: 512 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: ['draft', 'active', 'archived'], required: true, default: 'draft' },
    maximumPageSize: { type: Number, required: true, min: 1, max: 100 },
    maximumBatchSize: { type: Number, required: true, min: 1, max: 250 },
    maximumQueryExecutionMs: { type: Number, required: true, min: 100, max: 10_000 },
    maximumAggregationExecutionMs: { type: Number, required: true, min: 100, max: 15_000 },
    maximumAggregationStages: { type: Number, required: true, min: 1, max: 12 },
    maximumLookupStages: { type: Number, required: true, min: 0, max: 2 },
    maximumResultBytes: { type: Number, required: true, min: 1_024, max: 8_388_608 },
    maximumDocumentBytes: { type: Number, required: true, min: 1_024, max: 8_388_608 },
    maximumCacheValueBytes: { type: Number, required: true, min: 1_024, max: 524_288 },
    cacheEnabled: { type: Boolean, required: true, default: true },
    distributedCacheEnabled: { type: Boolean, required: true, default: false },
    allowedCacheNamespaces: [{ type: String, enum: cacheNamespaces }],
    namespaceTtlOverrides: safeMap,
    staleWhileRevalidateNamespaces: [{ type: String, enum: cacheNamespaces }],
    negativeCacheNamespaces: [{ type: String, enum: cacheNamespaces }],
    querySamplingRateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    slowQueryThresholdMs: { type: Number, required: true, min: 10, max: 60_000 },
    highDocumentsExaminedRatioThreshold: { type: Number, required: true, min: 1, max: 10_000 },
    projectionLagThresholdMs: { type: Number, required: true, min: 1_000, max: 86_400_000 },
    connectionPoolCategory: { type: String, enum: ['small', 'standard', 'large'], required: true },
    timeoutProfile: { type: String, enum: ['interactive', 'standard', 'worker'], required: true },
    validation: {
      valid: { type: Boolean },
      safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
      validatedAt: { type: Date },
    },
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

schema.index({ scopeKey: 1, name: 1, version: 1 }, { unique: true, name: 'dap_policy_scope_name_version' });
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'dap_policy_scope_status' });
schema.index({ scopeKey: 1, status: 1 }, { name: 'dap_policy_active_lookup' });
schema.index({ scopeKey: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'dap_policy_idempotency' });

module.exports = mongoose.models.DataAccessPerformancePolicy || mongoose.model('DataAccessPerformancePolicy', schema);
