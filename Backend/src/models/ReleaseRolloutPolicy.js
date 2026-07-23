const mongoose = require('mongoose');
const { RELEASE_STRATEGIES } = require('../constants/releaseReadiness');
const { safeId, safeText, schema, tenantFields } = require('./releaseModelFields');
const rolloutPolicySchema = schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: safeText(1_000),
  version: { type: Number, required: true, min: 1, max: 1_000_000 },
  scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true },
  ...tenantFields,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  strategy: { type: String, enum: RELEASE_STRATEGIES, required: true },
  initialCanaryBasisPoints: { type: Number, min: 1, max: 5_000, default: 500 },
  canaryObservationMs: { type: Number, min: 1_000, max: 86_400_000, default: 300_000 },
  rolloutBatchBasisPoints: { type: Number, min: 1, max: 10_000, default: 2_500 },
  batchObservationMs: { type: Number, min: 1_000, max: 86_400_000, default: 300_000 },
  maximumUnavailableBasisPoints: { type: Number, min: 0, max: 10_000, default: 1_000 },
  maximumSurgeBasisPoints: { type: Number, min: 0, max: 10_000, default: 1_000 },
  healthGatePolicy: safeId(true),
  readinessGatePolicy: safeId(true),
  sloGatePolicy: safeId(true),
  errorBudgetGatePolicy: safeId(true),
  performanceGatePolicy: safeId(true),
  rollbackPolicy: safeId(true),
  rollForwardPolicy: safeId(true),
  migrationFailurePolicy: safeId(true),
  requireApprovalBeforeStart: { type: Boolean, default: true },
  requireApprovalBeforeProduction: { type: Boolean, default: true },
  requireApprovalBeforeRollback: { type: Boolean, default: true },
  requireApprovalBeforeUnsafeRollForward: { type: Boolean, default: true },
  createdBy: { type: String, required: true, trim: true, maxlength: 200 },
  updatedBy: { type: String, trim: true, maxlength: 200 },
  activatedBy: { type: String, trim: true, maxlength: 200 },
  archivedBy: { type: String, trim: true, maxlength: 200 },
});
rolloutPolicySchema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'release_rollout_policy_scope_status' });
rolloutPolicySchema.index({ scope: 1, organizationId: 1, workspaceId: 1, name: 1, version: 1 }, { unique: true, name: 'release_rollout_policy_version' });
module.exports = mongoose.models.ReleaseRolloutPolicy || mongoose.model('ReleaseRolloutPolicy', rolloutPolicySchema);
