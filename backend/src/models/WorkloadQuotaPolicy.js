const mongoose = require('mongoose');
const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const quotaFields = {
  maximumQueuedRuns: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumActiveRuns: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumQueuedNodes: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumActiveNodes: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumConcurrentInvocations: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumConcurrentCompensations: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumConcurrentRecoveries: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumQueueBytesEstimate: { type: Number, required: true, min: 1, max: 10_000_000_000 },
  maximumPayloadBytesPerJob: { type: Number, required: true, min: 1, max: 10_000_000 },
  maximumRunsPerMinute: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumInvocationsPerMinute: { type: Number, required: true, min: 1, max: 1_000_000 },
  maximumRetriesPerMinute: { type: Number, required: true, min: 1, max: 1_000_000 },
};

const workloadQuotaPolicySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1_000 },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', required: true, index: true },
    ...quotaFields,
    tenantWeight: { type: Number, required: true, min: 1, max: 100 },
    workspaceWeight: { type: Number, required: true, min: 1, max: 100 },
    burstCapacity: { type: Number, required: true, min: 0, max: 100_000 },
    burstWindowMs: { type: Number, required: true, min: 1_000, max: 3_600_000 },
    overloadBehavior: { type: String, enum: ['reject', 'defer', 'approval_required'], required: true },
    idempotencyKeyHash: { type: String, trim: true, match: SAFE_HASH_PATTERN, select: false },
    requestFingerprint: { type: String, trim: true, match: SAFE_HASH_PATTERN, select: false },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

workloadQuotaPolicySchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_scoped_quota_policy_version' },
);
workloadQuotaPolicySchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'unique_quota_policy_idempotency' },
);
workloadQuotaPolicySchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
workloadQuotaPolicySchema.index(
  { organizationId: 1, workspaceId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_scoped_quota_policy' },
);

module.exports = mongoose.models.WorkloadQuotaPolicy || mongoose.model('WorkloadQuotaPolicy', workloadQuotaPolicySchema);
