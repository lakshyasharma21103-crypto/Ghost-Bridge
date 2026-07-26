const mongoose = require('mongoose');
const { BACKUP_STATUSES, BACKUP_TYPES, REGIONAL_SCOPES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const schema = new mongoose.Schema(
  {
    backupId: { type: String, required: true, unique: true, trim: true, match: SAFE_ID },
    providerReferenceId: { type: String, trim: true, match: SAFE_ID },
    regionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    sourceRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    scope: { type: String, enum: REGIONAL_SCOPES, required: true },
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    backupType: { type: String, enum: BACKUP_TYPES, required: true },
    status: { type: String, enum: BACKUP_STATUSES, required: true, index: true },
    startedAt: { type: Date, required: true },
    completedAt: Date,
    recoverableThrough: Date,
    expiresAt: { type: Date, index: true },
    encryptionCategory: { type: String, enum: ['provider_managed', 'application_managed', 'not_applicable', 'unknown'], required: true },
    dataClassification: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], required: true },
    residencyTags: [{ type: String, trim: true, maxlength: 64 }],
    schemaVersion: { type: String, required: true, trim: true, maxlength: 64 },
    applicationVersion: { type: String, required: true, trim: true, maxlength: 64 },
    migrationVersion: { type: String, required: true, trim: true, maxlength: 64 },
    safeSizeCategory: { type: String, enum: ['tiny', 'small', 'medium', 'large', 'very_large', 'unknown'], required: true },
    safeDocumentCountCategory: { type: String, enum: ['none', 'low', 'moderate', 'high', 'very_high', 'unknown'], required: true },
    integrityManifestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BackupIntegrityManifest' },
    verificationStatus: { type: String, enum: ['unverified', 'verified', 'mismatch', 'incomplete', 'unknown'], required: true },
    lastVerifiedAt: Date,
    safeFailureCode: { type: String, trim: true, maxlength: 128 },
    idempotencyKeyHash: { type: String, required: true, select: false, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true, strict: 'throw' },
);
schema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, { name: 'backup_scope_status' });
schema.index({ recoverableThrough: -1 }, { name: 'backup_recovery_point' });
schema.index({ expiresAt: 1, status: 1 }, { name: 'backup_expiry' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'backup_idempotency' });
module.exports = mongoose.models.BackupManifest || mongoose.model('BackupManifest', schema);
