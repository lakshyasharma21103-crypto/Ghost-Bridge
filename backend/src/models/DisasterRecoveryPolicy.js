const mongoose = require('mongoose');
const { CRITICALITIES, DEGRADED_MODES, REGIONAL_SCOPES, VERSION_STATUSES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
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
    criticality: { type: String, enum: CRITICALITIES, required: true },
    recoveryPointObjectiveMs: { type: Number, required: true, min: 1_000, max: 31_536_000_000 },
    recoveryTimeObjectiveMs: { type: Number, required: true, min: 1_000, max: 31_536_000_000 },
    maximumPromotionReplicationLagMs: { type: Number, required: true, min: 0, max: 86_400_000 },
    maximumUnknownReplicationWindowMs: { type: Number, required: true, min: 0, max: 86_400_000 },
    maximumDegradedModeDurationMs: { type: Number, required: true, min: 1_000, max: 31_536_000_000 },
    preferredRecoveryRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    permittedRecoveryRegionIds: [{ type: String, trim: true, match: SAFE_ID }],
    prohibitedRecoveryRegionIds: [{ type: String, trim: true, match: SAFE_ID }],
    automaticFailoverAllowed: { type: Boolean, required: true, default: false },
    automaticFailoverConditions: [{ type: String, enum: ['source_unavailable', 'source_isolated', 'replication_eligible', 'target_healthy', 'authority_store_reachable'] }],
    requireApprovalForFailover: { type: Boolean, required: true, default: true },
    requireApprovalForFailback: { type: Boolean, required: true, default: true },
    requireApprovalForDataLossAcceptance: { type: Boolean, required: true, default: true },
    backupRequired: { type: Boolean, required: true, default: true },
    backupFrequencyMs: { type: Number, required: true, min: 60_000, max: 31_536_000_000 },
    backupRetentionMs: { type: Number, required: true, min: 60_000, max: 315_360_000_000 },
    restoreVerificationFrequencyMs: { type: Number, required: true, min: 60_000, max: 31_536_000_000 },
    minimumHealthyServiceCount: { type: Number, required: true, min: 1, max: 10_000 },
    minimumHealthyWorkerCount: { type: Number, required: true, min: 0, max: 10_000 },
    minimumHealthyDatabaseCategory: { type: String, enum: ['healthy', 'elevated'], required: true },
    degradedMode: { type: String, enum: DEGRADED_MODES, required: true },
    protectedOperationCategories: [{ type: String, trim: true, match: SAFE_ID }],
    validation: { valid: Boolean, safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }], validatedAt: Date },
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
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'dr_policy_scope_status' });
schema.index({ scopeKey: 1, name: 1, version: 1 }, { unique: true, name: 'dr_policy_scope_name_version' });
schema.index({ scopeKey: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'dr_policy_idempotency' });
module.exports = mongoose.models.DisasterRecoveryPolicy || mongoose.model('DisasterRecoveryPolicy', schema);
