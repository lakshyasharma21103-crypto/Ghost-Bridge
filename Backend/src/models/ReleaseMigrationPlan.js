const mongoose = require('mongoose');
const { safeCodes, safeId, safeVersion, schema, tenantFields } = require('./releaseModelFields');

const migrationPlanSchema = schema({
  releaseCandidateId: safeId(true),
  ...tenantFields,
  migrationPlanVersion: safeVersion(true),
  requiredMigrationIds: [safeId()],
  requiredIndexChanges: [safeId()],
  requiredBackfills: [safeId()],
  requiredProjectionRebuilds: [safeId()],
  migrationStrategy: { type: String, enum: ['none', 'expand_contract', 'additive_only', 'stop_the_world', 'roll_forward_only'], required: true },
  rollbackStrategy: { type: String, enum: ['safe', 'conditional', 'unsafe', 'unavailable'], required: true },
  preflightChecks: [safeId()],
  postMigrationChecks: [safeId()],
  rollbackChecks: [safeId()],
  estimatedDurationCategory: { type: String, enum: ['tiny', 'short', 'medium', 'long', 'unknown'], default: 'unknown' },
  estimatedDataVolumeCategory: { type: String, enum: ['tiny', 'small', 'medium', 'large', 'unknown'], default: 'unknown' },
  requiresMaintenanceMode: { type: Boolean, default: false },
  requiresAdmissionFreeze: { type: Boolean, default: false },
  requiresWorkerDrain: { type: Boolean, default: false },
  requiresApproval: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'validated', 'blocked', 'approved', 'executing', 'completed', 'failed', 'rollback_required'], default: 'draft' },
  safeReasonCodes: safeCodes,
});
migrationPlanSchema.index({ releaseCandidateId: 1, migrationPlanVersion: 1 }, { unique: true, name: 'release_migration_candidate_version' });
migrationPlanSchema.index({ organizationId: 1, workspaceId: 1, status: 1 }, { name: 'release_migration_scope_status' });
module.exports = mongoose.models.ReleaseMigrationPlan || mongoose.model('ReleaseMigrationPlan', migrationPlanSchema);
