const mongoose = require('mongoose');
const { safeId, schema, tenantFields } = require('./releaseModelFields');
const checkpointSchema = schema({
  migrationPlanId: safeId(true),
  migrationId: safeId(true),
  ...tenantFields,
  leaseOwnerId: safeId(),
  fencingToken: { type: Number, required: true, min: 1 },
  checkpoint: { type: Number, required: true, min: 0 },
  processedKeyDigests: [{ type: String, match: /^sha256:[a-f0-9]{64}$/ }],
  status: { type: String, enum: ['pending', 'executing', 'paused', 'completed', 'failed'], default: 'pending' },
  lastCheckpointAt: Date,
});
checkpointSchema.index({ migrationPlanId: 1, migrationId: 1 }, { unique: true, name: 'release_migration_checkpoint_identity' });
module.exports = mongoose.models.ReleaseMigrationCheckpoint || mongoose.model('ReleaseMigrationCheckpoint', checkpointSchema);
