const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    collectionName: { type: String, required: true, trim: true, maxlength: 120, immutable: true },
    indexName: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    status: { type: String, required: true, enum: ['healthy', 'missing', 'mismatched', 'unexpected', 'migration_required', 'duplicate', 'unsupported'] },
    safeReasonCode: { type: String, trim: true, maxlength: 128 },
    detectedAt: { type: Date, required: true, default: Date.now },
    resolvedAt: { type: Date },
    migrationVersion: { type: Number, min: 1 },
    expiresAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

schema.index({ collectionName: 1, indexName: 1, detectedAt: -1 }, { name: 'dap_index_drift_identity' });
schema.index({ status: 1, detectedAt: -1 }, { name: 'dap_index_drift_status' });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'dap_index_drift_expiry' });

module.exports = mongoose.models.IndexDriftRecord || mongoose.model('IndexDriftRecord', schema);
