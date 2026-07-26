const mongoose = require('mongoose');
const { RELEASE_STRATEGIES, ROLLOUT_STATUSES } = require('../constants/releaseReadiness');
const { requestFields, safeId, safeVersion, schema, tenantFields } = require('./releaseModelFields');
const rolloutPlanSchema = schema({
  releaseCandidateId: safeId(true),
  deploymentTargetId: safeId(true),
  rolloutPolicyId: safeId(true),
  rolloutPolicyVersion: { type: Number, required: true, min: 1, max: 1_000_000 },
  ...tenantFields,
  sourceVersion: safeVersion(true),
  targetVersion: safeVersion(true),
  strategy: { type: String, enum: RELEASE_STRATEGIES, required: true },
  regionOrder: [safeId()],
  serviceOrder: [safeId()],
  workerPoolOrder: [safeId()],
  status: { type: String, enum: ROLLOUT_STATUSES, default: 'draft' },
  currentStage: safeId(),
  currentBatch: { type: Number, min: 0, default: 0 },
  completedBatchCount: { type: Number, min: 0, default: 0 },
  failedBatchCount: { type: Number, min: 0, default: 0 },
  healthGateStatus: safeId(),
  readinessGateStatus: safeId(),
  migrationStatus: safeId(),
  smokeTestStatus: safeId(),
  sloGateStatus: safeId(),
  performanceGateStatus: safeId(),
  rollbackReadinessStatus: safeId(),
  approvalRequestId: safeId(),
  incidentId: safeId(),
  requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
  approvedBy: { type: String, trim: true, maxlength: 200 },
  ...requestFields,
  startedAt: Date,
  completedAt: Date,
});
rolloutPlanSchema.index({ releaseCandidateId: 1 }, { name: 'release_rollout_candidate' });
rolloutPlanSchema.index({ deploymentTargetId: 1, status: 1 }, { name: 'release_rollout_target_status' });
rolloutPlanSchema.index({ createdAt: -1 }, { name: 'release_rollout_created' });
rolloutPlanSchema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'release_rollout_idempotency' });
module.exports = mongoose.models.ReleaseRolloutPlan || mongoose.model('ReleaseRolloutPlan', rolloutPlanSchema);
