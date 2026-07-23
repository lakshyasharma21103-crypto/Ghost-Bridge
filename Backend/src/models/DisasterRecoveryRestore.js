const mongoose = require('mongoose');
const { REGIONAL_SCOPES, RESTORE_MODES, RESTORE_STATES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const schema = new mongoose.Schema(
  {
    backupId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    sourceRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    targetRegionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    scope: { type: String, enum: REGIONAL_SCOPES, required: true },
    restoreMode: { type: String, enum: RESTORE_MODES, required: true },
    status: { type: String, enum: RESTORE_STATES, required: true, default: 'requested', index: true },
    isolatedTargetReference: { type: String, required: true, trim: true, match: SAFE_ID },
    applicationVersion: { type: String, required: true, trim: true, maxlength: 64 },
    schemaVersion: { type: String, required: true, trim: true, maxlength: 64 },
    migrationVersion: { type: String, required: true, trim: true, maxlength: 64 },
    integrityStatus: { type: String, enum: ['pending', 'verified', 'mismatch', 'incomplete', 'unknown'], required: true },
    migrationStatus: { type: String, enum: ['pending', 'compatible', 'incompatible', 'failed'], required: true },
    indexStatus: { type: String, enum: ['pending', 'valid', 'drifted', 'failed'], required: true },
    projectionStatus: { type: String, enum: ['pending', 'rebuilding', 'ready', 'failed'], required: true },
    externalInvocationsEnabled: { type: Boolean, required: true, default: false },
    credentialUseEnabled: { type: Boolean, required: true, default: false },
    outboundCallbacksEnabled: { type: Boolean, required: true, default: false },
    approvalRequestId: { type: String, trim: true, match: SAFE_ID },
    incidentId: { type: String, trim: true, match: SAFE_ID },
    requestId: { type: String, required: true, trim: true, maxlength: 128 },
    traceId: { type: String, required: true, trim: true, maxlength: 128 },
    idempotencyKeyHash: { type: String, required: true, select: false, trim: true, maxlength: 80 },
    requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);
schema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, { name: 'restore_scope_status' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'restore_idempotency' });
module.exports = mongoose.models.DisasterRecoveryRestore || mongoose.model('DisasterRecoveryRestore', schema);
