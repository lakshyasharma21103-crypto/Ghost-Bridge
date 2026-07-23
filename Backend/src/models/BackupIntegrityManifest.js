const mongoose = require('mongoose');
const SAFE_COLLECTION = /^[A-Za-z][A-Za-z0-9_]{0,127}$/;
const SAFE_DIGEST = /^(?:hmac-sha256):[a-f0-9]{64}$/;
const summarySchema = new mongoose.Schema(
  {
    collectionName: { type: String, required: true, trim: true, match: SAFE_COLLECTION },
    safeDocumentCount: { type: Number, required: true, min: 0 },
    safeByteCategory: { type: String, enum: ['none', 'tiny', 'small', 'medium', 'large', 'very_large', 'unknown'], required: true },
    indexManifestVersion: { type: String, required: true, trim: true, maxlength: 64 },
    schemaVersion: { type: String, required: true, trim: true, maxlength: 64 },
    sequenceRange: { minimum: { type: Number, min: 0 }, maximum: { type: Number, min: 0 } },
    keyedIntegrityDigest: { type: String, trim: true, match: SAFE_DIGEST },
  },
  { _id: false, strict: 'throw' },
);
const schema = new mongoose.Schema(
  {
    backupId: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    manifestVersion: { type: Number, required: true, min: 1, max: 1_000 },
    collectionSummaries: { type: [summarySchema], required: true, validate: (items) => items.length <= 250 },
    overallIntegrityStatus: { type: String, enum: ['unverified', 'verified', 'mismatch', 'incomplete', 'unknown'], required: true },
    verifiedAt: Date,
    verifiedBy: { type: String, trim: true, maxlength: 200 },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
  },
  { timestamps: true, strict: 'throw' },
);
module.exports = mongoose.models.BackupIntegrityManifest || mongoose.model('BackupIntegrityManifest', schema);
