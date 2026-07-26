const mongoose = require('mongoose');

const tenantDeletionTombstoneSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, unique: true, trim: true },
    deletionJobId: { type: String, required: true, unique: true, trim: true },
    deletionCompletedAt: { type: Date, required: true },
    safeReason: { type: String, required: true, trim: true, maxlength: 1_000 },
    evidenceReferences: { type: [String], default: undefined },
    deletionSchemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

module.exports =
  mongoose.models.TenantDeletionTombstone ||
  mongoose.model('TenantDeletionTombstone', tenantDeletionTombstoneSchema);
