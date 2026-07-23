const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    projectionName: { type: String, required: true, trim: true, maxlength: 120, immutable: true },
    projectionVersion: { type: Number, required: true, min: 1, immutable: true },
    organizationId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    sourceSequence: { type: Number, required: true, min: 0, default: 0 },
    rebuildCheckpoint: { type: Number, required: true, min: 0, default: 0 },
    lastProcessedAt: { type: Date },
    lastRebuildAt: { type: Date },
    generatedAt: { type: Date },
    status: { type: String, enum: ['active', 'rebuilding', 'delayed', 'failed', 'paused'], required: true, default: 'active' },
    lagCategory: { type: String, enum: ['none', 'low', 'moderate', 'high', 'critical'], required: true, default: 'none' },
    safeFailureCode: { type: String, trim: true, maxlength: 128 },
    leaseOwner: { type: String, trim: true, maxlength: 200 },
    leaseEpoch: { type: Number, required: true, min: 0, default: 0 },
    leaseExpiresAt: { type: Date },
    rebuildIdempotencyKeyHash: { type: String, trim: true, maxlength: 80 },
    sourceRegionId: { type: String, trim: true, maxlength: 128 },
    projectionRegionId: { type: String, trim: true, maxlength: 128 },
    sourceAuthorityEpoch: { type: Number, min: 0 },
    replicationCheckpoint: { type: String, trim: true, maxlength: 200 },
    stalenessCategory: { type: String, enum: ['fresh', 'bounded', 'stale', 'critical', 'unknown'], default: 'unknown' },
  },
  { timestamps: true, strict: 'throw' },
);

schema.index({ organizationId: 1, workspaceId: 1, projectionName: 1 }, { unique: true, name: 'dap_projection_scope_name' });
schema.index({ status: 1, updatedAt: -1 }, { name: 'dap_projection_status' });
schema.index({ lagCategory: 1, updatedAt: -1 }, { name: 'dap_projection_lag' });
schema.index({ leaseExpiresAt: 1, status: 1 }, { sparse: true, name: 'dap_projection_lease' });
schema.index({ projectionRegionId: 1, status: 1 }, { sparse: true, name: 'regional_projection_region_status' });

module.exports = mongoose.models.ProjectionMetadata || mongoose.model('ProjectionMetadata', schema);
