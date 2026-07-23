const mongoose = require('mongoose');
const { RELEASE_CANDIDATE_STATUSES } = require('../constants/releaseReadiness');
const {
  requestFields,
  safeId,
  safeText,
  safeVersion,
  schema,
  tenantFields,
} = require('./releaseModelFields');

const summary = {
  status: { type: String, enum: ['unknown', 'passed', 'warning', 'blocked'], default: 'unknown' },
  safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
  evidenceReference: safeText(512),
};

const releaseCandidateSchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  ...tenantFields,
  name: { type: String, required: true, trim: true, maxlength: 120 },
  version: safeVersion(true),
  status: { type: String, enum: RELEASE_CANDIDATE_STATUSES, default: 'draft', required: true },
  sourceRevision: { type: String, required: true, trim: true, match: /^[a-f0-9]{7,64}$/i },
  sourceBranchCategory: { type: String, enum: ['main', 'release', 'feature', 'hotfix', 'unknown'], default: 'unknown' },
  sourceRepositoryCategory: { type: String, enum: ['primary', 'fork', 'mirror', 'unknown'], default: 'primary' },
  applicationVersion: safeVersion(true),
  backendVersion: safeVersion(true),
  frontendVersion: safeVersion(true),
  externalAgentVersion: safeVersion(true),
  protocolVersion: safeVersion(true),
  schemaVersion: safeVersion(true),
  migrationVersion: safeVersion(true),
  routingVersion: safeVersion(true),
  cacheSerializationVersion: safeVersion(true),
  projectionVersion: safeVersion(true),
  releaseManifestId: safeId(),
  buildProvenanceId: safeId(),
  artifactManifestId: safeId(),
  compatibilityMatrixId: safeId(),
  rolloutPolicyId: safeId(),
  performanceBaselineId: safeId(),
  capacityPlanId: safeId(),
  disasterRecoveryPolicyId: safeId(),
  testSummary: summary,
  securitySummary: summary,
  migrationSummary: summary,
  readinessSummary: summary,
  riskSummary: summary,
  requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
  validatedBy: { type: String, trim: true, maxlength: 200 },
  approvedBy: { type: String, trim: true, maxlength: 200 },
  ...requestFields,
  validatedAt: Date,
  approvedAt: Date,
  releasedAt: Date,
});

releaseCandidateSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, { name: 'release_candidate_scope_status_created' });
releaseCandidateSchema.index({ organizationId: 1, version: 1 }, { unique: true, name: 'release_candidate_version' });
releaseCandidateSchema.index({ sourceRevision: 1 }, { name: 'release_candidate_source_revision' });
releaseCandidateSchema.index({ organizationId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'release_candidate_idempotency' });

module.exports = mongoose.models.ReleaseCandidate || mongoose.model('ReleaseCandidate', releaseCandidateSchema);
