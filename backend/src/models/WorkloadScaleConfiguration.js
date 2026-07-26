const mongoose = require('mongoose');
const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const SENSITIVE_KEY_PATTERN = /(authorization|bearer|credential|secret|token|api.?key|password|payload)/i;

function safeConfiguration(value, depth = 0) {
  if (depth > 8) return false;
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.length <= 512 && value.every((item) => safeConfiguration(item, depth + 1));
  if (typeof value !== 'object') return false;
  return Object.entries(value).every(([key, item]) => !SENSITIVE_KEY_PATTERN.test(key) && safeConfiguration(item, depth + 1));
}

const safeMixed = {
  type: mongoose.Schema.Types.Mixed,
  required: true,
  validate: { validator: safeConfiguration, message: 'Configuration contains an unsafe or unbounded value.' },
};

const workloadScaleConfigurationSchema = new mongoose.Schema(
  {
    scopeKey: { type: String, required: true, trim: true, maxlength: 256 },
    organizationId: { type: String, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', required: true, index: true },
    routingVersions: safeMixed,
    partitionCountByCategory: safeMixed,
    workerPoolConfiguration: safeMixed,
    claimBatchSizeByCategory: safeMixed,
    leaseDurationByCategory: safeMixed,
    heartbeatIntervalByCategory: safeMixed,
    maximumConcurrencyByCategory: safeMixed,
    reservedCapacityByCategory: safeMixed,
    backpressureThresholds: safeMixed,
    overloadBehavior: { type: String, enum: ['reject', 'defer', 'approval_required'], required: true },
    autoscalingTargets: safeMixed,
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

workloadScaleConfigurationSchema.index({ scopeKey: 1, version: 1 }, { unique: true, name: 'unique_scale_configuration_version' });
workloadScaleConfigurationSchema.index(
  { scopeKey: 1, idempotencyKeyHash: 1 },
  { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'unique_scale_configuration_idempotency' },
);
workloadScaleConfigurationSchema.index({ scopeKey: 1, status: 1, updatedAt: -1 });
workloadScaleConfigurationSchema.index(
  { scopeKey: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_scale_configuration' },
);

module.exports = mongoose.models.WorkloadScaleConfiguration || mongoose.model('WorkloadScaleConfiguration', workloadScaleConfigurationSchema);
module.exports.safeConfiguration = safeConfiguration;
