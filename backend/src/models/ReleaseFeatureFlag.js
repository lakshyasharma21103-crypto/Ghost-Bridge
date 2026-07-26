const mongoose = require('mongoose');
const { safeId, safeText, schema, tenantFields } = require('./releaseModelFields');
const featureFlagSchema = schema({
  key: safeId(true),
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  description: safeText(1_000),
  version: { type: Number, required: true, min: 1, max: 1_000_000 },
  scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true },
  ...tenantFields,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  defaultState: { type: Boolean, required: true, default: false },
  rolloutPercentageBasisPoints: { type: Number, min: 0, max: 10_000, default: 0 },
  allowedEnvironmentCategories: [{ type: String, enum: ['development', 'test', 'ci', 'integration', 'staging', 'production'] }],
  allowedRegionIds: [safeId()],
  allowedTenantCategories: [safeId()],
  requiredReleaseCandidateId: safeId(),
  killSwitch: { type: Boolean, default: false },
  expiresAt: Date,
  owner: { type: String, required: true, trim: true, maxlength: 200 },
  createdBy: { type: String, required: true, trim: true, maxlength: 200 },
  activatedBy: { type: String, trim: true, maxlength: 200 },
});
featureFlagSchema.index({ key: 1, version: 1 }, { unique: true, name: 'release_feature_flag_version' });
featureFlagSchema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'release_feature_flag_scope_status' });
featureFlagSchema.index({ expiresAt: 1 }, { name: 'release_feature_flag_expiry' });
module.exports = mongoose.models.ReleaseFeatureFlag || mongoose.model('ReleaseFeatureFlag', featureFlagSchema);
