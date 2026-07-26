const mongoose = require('mongoose');
const {
  DEGRADED_MODES,
  REGIONAL_ROLES,
  REGIONAL_SCOPES,
  REGIONAL_STATES,
  VERSION_STATUSES,
} = require('../constants/regionalResilience');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_TAG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const regionSchema = new mongoose.Schema(
  {
    regionId: { type: String, required: true, trim: true, match: SAFE_ID },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    regionGroup: { type: String, required: true, trim: true, match: SAFE_ID },
    role: { type: String, enum: REGIONAL_ROLES, required: true },
    state: { type: String, enum: REGIONAL_STATES, required: true },
    priority: { type: Number, required: true, min: 1, max: 1_000 },
    safeProviderCategory: { type: String, trim: true, match: SAFE_TAG, default: 'provider_neutral' },
    dataResidencyTags: [{ type: String, trim: true, match: SAFE_TAG }],
    allowedDataClassifications: [{ type: String, enum: ['public', 'internal', 'confidential', 'restricted'] }],
    supportsWriteAuthority: { type: Boolean, required: true, default: false },
    supportsWorkerExecution: { type: Boolean, required: true, default: false },
    supportsRecoveryExecution: { type: Boolean, required: true, default: false },
    supportsControlPlaneProjections: { type: Boolean, required: true, default: false },
    supportsReadOnlyTraffic: { type: Boolean, required: true, default: false },
    supportsBackupRestore: { type: Boolean, required: true, default: false },
    maximumStalenessMs: { type: Number, required: true, min: 0, max: 86_400_000, default: 60_000 },
    enabled: { type: Boolean, required: true, default: true },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: REGIONAL_SCOPES, required: true },
    scopeKey: { type: String, required: true, trim: true, maxlength: 512 },
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: VERSION_STATUSES, required: true, default: 'draft' },
    regions: { type: [regionSchema], required: true, validate: (items) => items.length >= 1 && items.length <= 16 },
    preferredPrimaryRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    defaultStandbyRegionId: { type: String, trim: true, match: SAFE_ID },
    permittedFailoverRegionIds: [{ type: String, trim: true, match: SAFE_ID }],
    prohibitedFailoverRegionIds: [{ type: String, trim: true, match: SAFE_ID }],
    maximumReplicationLagForPromotionMs: { type: Number, required: true, min: 0, max: 86_400_000 },
    maximumDataLossWindowMs: { type: Number, required: true, min: 0, max: 86_400_000 },
    regionalHealthTimeoutMs: { type: Number, required: true, min: 5_000, max: 3_600_000 },
    regionalHeartbeatIntervalMs: { type: Number, required: true, min: 1_000, max: 300_000 },
    authorityLeaseDurationMs: { type: Number, required: true, min: 5_000, max: 3_600_000 },
    authorityHeartbeatIntervalMs: { type: Number, required: true, min: 1_000, max: 300_000 },
    failoverApprovalPolicy: { type: String, enum: ['always', 'policy_governed', 'emergency_automatic'], default: 'always' },
    failbackApprovalPolicy: { type: String, enum: ['always', 'policy_governed'], default: 'always' },
    degradedModePolicy: { type: String, enum: DEGRADED_MODES, default: 'disabled' },
    cacheIsolationMode: { type: String, enum: ['region_local', 'explicit_distributed'], default: 'region_local' },
    projectionRecoveryPolicy: { type: String, enum: ['rebuild', 'catch_up', 'manual'], default: 'catch_up' },
    validation: {
      valid: Boolean,
      safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
      validatedAt: Date,
    },
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: Date,
    archivedAt: Date,
  },
  { timestamps: true, strict: 'throw' },
);

schema.path('regions').validate((regions) => new Set(regions.map((region) => region.regionId)).size === regions.length, 'Region IDs must be unique.');
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'regional_configuration_scope_status' });
schema.index({ scopeKey: 1, name: 1, version: 1 }, { unique: true, name: 'regional_configuration_scope_name_version' });
schema.index({ scopeKey: 1, status: 1 }, { name: 'regional_configuration_active' });
schema.index({ scopeKey: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'regional_configuration_idempotency' });

module.exports = mongoose.models.RegionalDeploymentConfiguration || mongoose.model('RegionalDeploymentConfiguration', schema);
