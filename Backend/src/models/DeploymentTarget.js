const mongoose = require('mongoose');
const { safeId, schema } = require('./releaseModelFields');
const deploymentTargetSchema = schema({
  targetId: { ...safeId(true), unique: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ['local', 'integration', 'staging', 'production'], required: true },
  enabled: { type: Boolean, required: true, default: false },
  regionIds: [safeId()],
  serviceCategories: [safeId()],
  expectedInstanceCategories: [safeId()],
  expectedWorkerPoolCategories: [safeId()],
  allowedReleaseStrategies: [{ type: String, enum: ['all_at_once', 'rolling', 'canary', 'blue_green', 'regional_sequential', 'manual'] }],
  requiresApproval: { type: Boolean, default: true },
  requiresManualExecution: { type: Boolean, default: true },
  allowsSmokeTests: { type: Boolean, default: false },
  allowsSyntheticTraffic: { type: Boolean, default: false },
  maximumSyntheticTrafficCategory: { type: String, enum: ['none', 'tiny', 'small'], default: 'none' },
  dataResidencyTags: [safeId()],
  safeProviderCategory: safeId(true),
});
deploymentTargetSchema.path('allowsSyntheticTraffic').validate(function productionTrafficDisabled(value) {
  return this.category !== 'production' || value === false;
}, 'Production deployment targets cannot allow synthetic traffic.');
module.exports = mongoose.models.DeploymentTarget || mongoose.model('DeploymentTarget', deploymentTargetSchema);
