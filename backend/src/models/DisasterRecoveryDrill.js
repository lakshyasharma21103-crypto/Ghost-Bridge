const mongoose = require('mongoose');
const { DRILL_STATUSES, DRILL_TYPES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const safeText = { type: String, trim: true, maxlength: 500 };
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1_000, default: '' },
    organizationId: { type: String, required: true, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, index: true },
    disasterRecoveryPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DisasterRecoveryPolicy', required: true },
    disasterRecoveryPolicyVersion: { type: Number, required: true, min: 1 },
    drillType: { type: String, enum: DRILL_TYPES, required: true },
    sourceRegionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    targetRegionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    status: { type: String, enum: DRILL_STATUSES, required: true, default: 'draft', index: true },
    plannedStartAt: { type: Date, index: true },
    startedAt: Date,
    completedAt: Date,
    expectedRpoMs: { type: Number, required: true, min: 0 },
    measuredRpoMs: { type: Number, min: 0 },
    expectedRtoMs: { type: Number, required: true, min: 0 },
    measuredRtoMs: { type: Number, min: 0 },
    failoverPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegionalFailoverPlan' },
    restoreOperationId: { type: mongoose.Schema.Types.ObjectId, ref: 'DisasterRecoveryRestore' },
    incidentId: { type: String, trim: true, match: SAFE_ID },
    safeFindings: [safeText],
    safeActionItems: [safeText],
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    approvedBy: { type: String, trim: true, maxlength: 200 },
    idempotencyKeyHash: { type: String, required: true, select: false, trim: true, maxlength: 80 },
  },
  { timestamps: true, strict: 'throw' },
);
schema.index({ organizationId: 1, workspaceId: 1, status: 1, plannedStartAt: -1 }, { name: 'drill_scope_status_schedule' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'drill_idempotency' });
module.exports = mongoose.models.DisasterRecoveryDrill || mongoose.model('DisasterRecoveryDrill', schema);
