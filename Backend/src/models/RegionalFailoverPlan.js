const mongoose = require('mongoose');
const {
  FAILOVER_STATES,
  FAILOVER_TRIGGERS,
  FAILOVER_TYPES,
  REGIONAL_SCOPES,
} = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const stepSchema = new mongoose.Schema(
  {
    stepKey: { type: String, required: true, trim: true, match: SAFE_ID },
    order: { type: Number, required: true, min: 1, max: 100 },
    actionType: { type: String, required: true, trim: true, match: SAFE_ID },
    dependencyStepKeys: [{ type: String, trim: true, match: SAFE_ID }],
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], required: true, default: 'pending' },
    safeReasonCode: { type: String, trim: true, match: SAFE_CODE },
    startedAt: Date,
    completedAt: Date,
  },
  { _id: false, strict: 'throw' },
);
const schema = new mongoose.Schema(
  {
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    scope: { type: String, enum: REGIONAL_SCOPES, required: true },
    disasterRecoveryPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DisasterRecoveryPolicy', required: true },
    disasterRecoveryPolicyVersion: { type: Number, required: true, min: 1 },
    regionalConfigurationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegionalDeploymentConfiguration', required: true },
    regionalConfigurationVersion: { type: Number, required: true, min: 1 },
    sourceRegionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    targetRegionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    failoverType: { type: String, enum: FAILOVER_TYPES, required: true },
    triggerType: { type: String, enum: FAILOVER_TRIGGERS, required: true },
    status: { type: String, enum: FAILOVER_STATES, required: true, default: 'requested', index: true },
    sourceAuthorityEpoch: { type: Number, required: true, min: 0 },
    targetAuthorityEpoch: { type: Number, required: true, min: 1 },
    expectedRpoMs: { type: Number, required: true, min: 0 },
    expectedRtoMs: { type: Number, required: true, min: 0 },
    measuredRpoMs: { type: Number, min: 0 },
    measuredRtoMs: { type: Number, min: 0 },
    orderedSteps: { type: [stepSchema], required: true, validate: (items) => items.length >= 1 && items.length <= 100 },
    completedStepCount: { type: Number, required: true, default: 0, min: 0, max: 100 },
    failedStepCount: { type: Number, required: true, default: 0, min: 0, max: 100 },
    approvalRequestId: { type: String, trim: true, match: SAFE_ID },
    dataLossApprovalRequestId: { type: String, trim: true, match: SAFE_ID },
    incidentId: { type: String, trim: true, match: SAFE_ID },
    potentialDataLoss: { type: Boolean, required: true, default: false },
    dataLossAccepted: { type: Boolean, required: true, default: false },
    admissionFrozen: { type: Boolean, required: true, default: false },
    sourceFenced: { type: Boolean, required: true, default: false },
    queueOwnershipTransferred: { type: Boolean, required: true, default: false },
    cacheInvalidated: { type: Boolean, required: true, default: false },
    projectionsRecovered: { type: Boolean, required: true, default: false },
    safeReasonCodes: [{ type: String, trim: true, match: SAFE_CODE }],
    requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
    approvedBy: { type: String, trim: true, maxlength: 200 },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    idempotencyKeyHash: { type: String, required: true, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, required: true, select: false, trim: true, maxlength: 80 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);
schema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, { name: 'regional_failover_scope_status' });
schema.index({ sourceRegionId: 1, targetRegionId: 1, createdAt: -1 }, { name: 'regional_failover_region_pair' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'regional_failover_idempotency' });
module.exports = mongoose.models.RegionalFailoverPlan || mongoose.model('RegionalFailoverPlan', schema);
