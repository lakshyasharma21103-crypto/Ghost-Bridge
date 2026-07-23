const mongoose = require('mongoose');
const { CACHE_NAMESPACES } = require('../constants/dataAccessPerformance');

const schema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, trim: true, maxlength: 200, immutable: true },
    namespace: { type: String, required: true, enum: CACHE_NAMESPACES.map((entry) => entry.namespace), immutable: true },
    entityType: { type: String, required: true, trim: true, maxlength: 120, immutable: true },
    entityId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    entityVersion: { type: String, trim: true, maxlength: 120, immutable: true },
    invalidationTags: [{ type: String, trim: true, maxlength: 120 }],
    invalidationReasonCode: { type: String, required: true, trim: true, maxlength: 128 },
    sequence: { type: Number, required: true, min: 1, immutable: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], required: true, default: 'pending' },
    attempt: { type: Number, required: true, min: 0, max: 20, default: 0 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    leaseOwner: { type: String, trim: true, maxlength: 200 },
    leaseEpoch: { type: Number, min: 0, default: 0 },
    leaseExpiresAt: { type: Date },
    idempotencyKeyHash: { type: String, required: true, trim: true, maxlength: 80, immutable: true },
    requestId: { type: String, trim: true, maxlength: 200, immutable: true },
    traceId: { type: String, trim: true, maxlength: 200, immutable: true },
    expiresAt: { type: Date },
    completedAt: { type: Date },
    safeFailureCode: { type: String, trim: true, maxlength: 128 },
    legalHoldProtected: { type: Boolean, required: true, default: false },
    targetRegionId: { type: String, trim: true, maxlength: 128, immutable: true },
    invalidationScope: { type: String, enum: ['region_specific', 'all_regions', 'active_alias', 'tenant_region', 'projection'], default: 'region_specific', immutable: true },
  },
  { timestamps: true, strict: 'throw' },
);

schema.index({ organizationId: 1, workspaceId: 1, status: 1, nextAttemptAt: 1 }, { name: 'dap_invalidation_scope_status_retry' });
schema.index({ namespace: 1, status: 1 }, { name: 'dap_invalidation_namespace_status' });
schema.index({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1, sequence: 1 }, { name: 'dap_cache_invalidation_claim' });
schema.index({ organizationId: 1, workspaceId: 1, sequence: 1 }, { name: 'dap_invalidation_scope_sequence' });
schema.index({ organizationId: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'dap_invalidation_idempotency' });
schema.index({ requestId: 1 }, { sparse: true, name: 'dap_invalidation_request' });
schema.index({ traceId: 1 }, { sparse: true, name: 'dap_invalidation_trace' });
schema.index({ targetRegionId: 1, status: 1, sequence: 1 }, { sparse: true, name: 'regional_invalidation_region_status' });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { legalHoldProtected: false }, name: 'dap_invalidation_expiry' });

module.exports = mongoose.models.CacheInvalidationEvent || mongoose.model('CacheInvalidationEvent', schema);
