const mongoose = require('mongoose');
const {
  ANALYTICS_CLASSIFICATIONS,
  COLLECTION_STATES,
  FEEDBACK_TAXONOMY,
} = require('../constants/pilotAnalytics');

const mixed = { type: mongoose.Schema.Types.Mixed, default: () => ({}) };
const safeId = (required = false) => ({ type: String, required, trim: true, maxlength: 200, match: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/ });
const safeKey = (required = false) => ({ type: String, required, trim: true, maxlength: 128, match: /^[a-z][a-z0-9_.:-]{0,127}$/ });
const safeText = (maximum = 2_000) => ({ type: String, trim: true, maxlength: maximum });
const actor = safeId();
const tenant = { organizationId: safeId(true), workspaceId: safeId() };
const pilotTenant = { pilotProgramId: safeId(true), ...tenant };
const auditFields = { createdBy: actor, updatedBy: actor, activatedBy: actor, archivedBy: actor };
const requestFields = { requestId: safeId(), traceId: safeId() };
const SECRET_PATTERN = /(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/|redis(?:s)?:\/\/|-----BEGIN [^-]*PRIVATE KEY-----|"(?:authorization|password|secret|runtimeToken|installKey|providerApiKey|rawPrompt|rawResponse|hiddenReasoning|orchestrationInput|orchestrationOutput|customerPayload)"\s*:)/i;

function model(name, fields, indexes = [], options = {}) {
  const definition = new mongoose.Schema(fields, {
    timestamps: true,
    strict: 'throw',
    minimize: false,
    optimisticConcurrency: options.optimisticConcurrency !== false,
  });
  for (const [keys, indexOptions] of indexes) definition.index(keys, indexOptions);
  definition.pre('validate', function rejectSensitiveAnalytics(next) {
    const serialized = JSON.stringify(this.toObject({ depopulate: true }));
    if (SECRET_PATTERN.test(serialized)) return next(new Error('ANALYTICS_SENSITIVE_DATA_FORBIDDEN'));
    return next();
  });
  if (options.versioned) {
    definition.pre('save', function immutableActiveVersion(next) {
      if (!this.isNew && this.status === 'active' && !this.isModified('status')) {
        const mutable = new Set(['status', 'archivedBy', 'updatedAt', '__v']);
        const disallowed = this.modifiedPaths().filter((path) => !mutable.has(path));
        if (disallowed.length) return next(new Error('ANALYTICS_ACTIVE_VERSION_IMMUTABLE'));
      }
      return next();
    });
  }
  return mongoose.models[name] || mongoose.model(name, definition);
}

const AnalyticsTrackingPlan = model('AnalyticsTrackingPlan', {
  planId: { ...safeId(true), unique: true },
  scope: { type: String, enum: ['platform', 'pilot_program', 'organization', 'workspace'], required: true },
  pilotProgramId: safeId(), organizationId: safeId(), workspaceId: safeId(),
  name: safeText(120), description: safeText(), version: safeId(true),
  status: { type: String, enum: ['draft', 'validating', 'active', 'archived'], default: 'draft' },
  eventDefinitionKeys: [safeKey()], requiredEventDefinitionKeys: [safeKey()], optionalEventDefinitionKeys: [safeKey()],
  collectionMode: { type: String, enum: ['disabled', 'minimal', 'standard', 'enhanced'], required: true },
  retentionPolicyReference: safeId(), consentPolicyReference: safeId(), redactionPolicyReference: safeId(),
  allowedClassifications: [{ type: String, enum: ANALYTICS_CLASSIFICATIONS }],
  prohibitedFields: [safeKey()], maximumEventBytes: { type: Number, min: 256, max: 65_536 },
  maximumProperties: { type: Number, min: 1, max: 64 }, maximumStringLength: { type: Number, min: 1, max: 2_000 },
  maximumArrayLength: { type: Number, min: 0, max: 100 }, samplingPolicy: mixed, ...auditFields,
}, [
  [{ scope: 1, pilotProgramId: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'analytics_tracking_plan_scope_status' }],
  [{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'analytics_tracking_plan_name_version' }],
], { versioned: true });

const PilotAnalyticsEvent = model('PilotAnalyticsEvent', {
  eventKey: safeKey(true), eventVersion: safeId(true), ...pilotTenant,
  subjectType: { type: String, enum: ['pilot_user', 'workspace', 'organization', 'orchestration_run', 'capability', 'support_case', 'feedback', 'experiment'], required: true },
  subjectReference: safeId(true), anonymousSubjectKey: safeId(), sessionKey: safeId(),
  sequence: { type: Number, min: 0 }, idempotencyKey: safeId(true), deduplicationKey: { ...safeId(true) },
  releaseCandidateId: safeId(), releaseVersion: safeId(), featureFlagSnapshotVersion: safeId(),
  capabilityKey: safeId(), capabilityGateStatus: safeId(), outcomeCategory: safeId(),
  safeFailureCode: safeId(), durationCategory: safeId(), countCategory: safeId(),
  sourceCategory: { type: String, enum: ['backend', 'frontend', 'worker', 'projection', 'import', 'simulation'], required: true },
  properties: mixed, classification: { type: String, enum: ANALYTICS_CLASSIFICATIONS, required: true },
  consentState: { type: String, enum: COLLECTION_STATES, required: true },
  samplingState: { type: String, enum: ['included', 'sampled_out'], required: true },
  ...requestFields, occurredAt: { type: Date, required: true }, receivedAt: { type: Date, required: true }, expiresAt: { type: Date, required: true },
}, [
  [{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, occurredAt: -1 }, { name: 'analytics_event_scope_time' }],
  [{ eventKey: 1, occurredAt: -1 }, { name: 'analytics_event_key_time' }],
  [{ organizationId: 1, workspaceId: 1, subjectReference: 1, occurredAt: -1 }, { name: 'analytics_event_subject_time' }],
  [{ organizationId: 1, workspaceId: 1, idempotencyKey: 1 }, { unique: true, name: 'analytics_event_idempotency' }],
  [{ organizationId: 1, workspaceId: 1, deduplicationKey: 1 }, { unique: true, name: 'analytics_event_deduplication' }],
  [{ requestId: 1 }, { sparse: true, name: 'analytics_event_request' }],
  [{ traceId: 1 }, { sparse: true, name: 'analytics_event_trace' }],
  [{ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'analytics_event_expiry' }],
]);

const PilotMetricDefinition = model('PilotMetricDefinition', {
  metricKey: safeKey(true), displayName: safeText(120), description: safeText(), version: safeId(true),
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  domain: safeKey(true), unit: { type: String, enum: ['count', 'percentage', 'basis_points', 'duration_ms', 'rate', 'category'], required: true },
  numeratorEventKeys: [safeKey()], denominatorEventKeys: [safeKey()], eligiblePopulationDefinition: safeId(),
  exclusionRules: [safeId()], windowDefinition: safeId(), aggregationFunction: safeId(),
  minimumSampleSize: { type: Number, min: 1, max: 1_000_000 }, missingDataBehavior: safeId(),
  classification: { type: String, enum: ANALYTICS_CLASSIFICATIONS }, ownerReference: safeId(), ...auditFields,
}, [
  [{ metricKey: 1, version: 1 }, { unique: true, name: 'pilot_metric_key_version' }],
  [{ status: 1, domain: 1 }, { name: 'pilot_metric_status_domain' }],
], { versioned: true });

const PilotFunnelDefinition = model('PilotFunnelDefinition', {
  funnelKey: safeKey(true), name: safeText(120), description: safeText(), version: safeId(true),
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  scope: safeId(), pilotProgramId: safeId(), capabilityKey: safeId(),
  orderedSteps: [{ eventKey: safeKey(true), safeConditionKey: safeKey() }],
  conversionWindowMs: { type: Number, min: 1 }, minimumSampleSize: { type: Number, min: 1 },
  identityType: safeId(), exclusionRules: [safeId()], denominatorDefinition: safeId(),
  allowedBreakdowns: [safeId()], ...auditFields,
}, [
  [{ funnelKey: 1, version: 1 }, { unique: true, name: 'pilot_funnel_key_version' }],
  [{ status: 1, pilotProgramId: 1 }, { name: 'pilot_funnel_status_program' }],
], { versioned: true });

const PilotCohortDefinition = model('PilotCohortDefinition', {
  cohortKey: safeKey(true), name: safeText(120), description: safeText(), version: safeId(true),
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  pilotProgramId: safeId(true), organizationId: safeId(true), entryEventKey: safeKey(true),
  entryWindow: mixed, eligibilityRules: [safeId()], exclusionRules: [safeId()],
  observationWindows: [{ type: Number, min: 1 }], allowedBreakdowns: [safeId()],
  minimumCohortSize: { type: Number, min: 2, max: 10_000 }, ownerReference: safeId(), ...auditFields,
}, [
  [{ cohortKey: 1, version: 1 }, { unique: true, name: 'pilot_cohort_key_version' }],
  [{ status: 1, pilotProgramId: 1 }, { name: 'pilot_cohort_status_program' }],
], { versioned: true });

const AnalyticsInstrumentationCoverage = model('AnalyticsInstrumentationCoverage', {
  releaseCandidateId: safeId(), trackingPlanId: safeId(true), trackingPlanVersion: safeId(true),
  environmentCategory: safeId(true), ...pilotTenant,
  requiredEventCount: Number, observedEventCount: Number, missingEventDefinitionKeys: [safeKey()],
  invalidEventDefinitionKeys: [safeKey()], unexpectedEventDefinitionKeys: [safeKey()],
  schemaFailureCount: Number, deduplicationCount: Number, redactionCount: Number, samplingCount: Number,
  status: { type: String, enum: ['complete', 'complete_with_warnings', 'incomplete', 'invalid', 'unknown'], required: true },
  generatedAt: Date,
}, [[{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, generatedAt: -1 }, { name: 'analytics_instrumentation_scope_time' }]]);

const PilotAnalyticsProjection = model('PilotAnalyticsProjection', {
  projectionName: safeId(true), projectionVersion: safeId(true), ...pilotTenant,
  windowStart: Date, windowEnd: Date, sourceSequence: { type: Number, min: 0 },
  rebuildCheckpoint: { type: Number, min: 0 }, status: safeId(), value: mixed,
  generatedAt: Date, staleAfter: Date,
}, [
  [{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, windowStart: -1 }, { name: 'pilot_analytics_projection_scope_window' }],
  [{ projectionName: 1, projectionVersion: 1, organizationId: 1, workspaceId: 1, windowStart: 1 }, { unique: true, name: 'pilot_analytics_projection_identity' }],
  [{ sourceSequence: 1 }, { name: 'pilot_analytics_projection_sequence' }],
  [{ generatedAt: -1 }, { name: 'pilot_analytics_projection_generated' }],
]);

const PilotFeedbackTheme = model('PilotFeedbackTheme', {
  pilotProgramId: safeId(true), organizationId: safeId(true), themeKey: safeKey(true), version: safeId(true),
  displayName: safeText(120), description: safeText(), status: safeId(),
  sourceCategoryKeys: [{ type: String, enum: FEEDBACK_TAXONOMY }], affectedCapabilityKeys: [safeId()],
  feedbackCountCategory: safeId(), affectedOrganizationCountCategory: safeId(),
  severityCategory: safeId(), trendCategory: { type: String, enum: ['increasing', 'stable', 'decreasing', 'insufficient_data'] },
  evidenceReferences: [safeId()], confidenceCategory: safeId(), ownerReference: safeId(),
}, [
  [{ pilotProgramId: 1, themeKey: 1, version: 1 }, { unique: true, name: 'pilot_feedback_theme_version' }],
  [{ status: 1 }, { name: 'pilot_feedback_theme_status' }],
  [{ trendCategory: 1 }, { name: 'pilot_feedback_theme_trend' }],
]);

const PilotProductOpportunity = model('PilotProductOpportunity', {
  opportunityId: { ...safeId(true), unique: true }, pilotProgramId: safeId(true), organizationId: safeId(true),
  title: safeText(160), safeSummary: safeText(), category: safeId(), affectedCapabilityKeys: [safeId()],
  sourceThemeKeys: [safeKey()], sourceMetricKeys: [safeKey()], sourceFunnelKeys: [safeKey()],
  sourceSupportCategories: [safeId()], evidenceReferences: [safeId()],
  opportunityType: { type: String, enum: ['onboarding_improvement', 'usability_improvement', 'reliability_improvement', 'performance_improvement', 'documentation_improvement', 'capability_enablement', 'quota_adjustment', 'support_improvement', 'integration_opportunity', 'product_feature', 'operational_improvement'], required: true },
  impactCategory: safeId(), effortCategory: safeId(), confidenceCategory: safeId(), riskCategory: safeId(),
  status: { type: String, enum: ['proposed', 'reviewing', 'approved', 'planned', 'testing', 'implemented', 'validated', 'rejected', 'archived'], default: 'proposed' },
  ownerReference: safeId(), ...auditFields,
}, [
  [{ pilotProgramId: 1, status: 1, createdAt: -1 }, { name: 'pilot_opportunity_program_status' }],
  [{ opportunityType: 1 }, { name: 'pilot_opportunity_type' }],
  [{ affectedCapabilityKeys: 1 }, { name: 'pilot_opportunity_capability' }],
]);

const PilotProductHypothesis = model('PilotProductHypothesis', {
  hypothesisId: { ...safeId(true), unique: true }, pilotProgramId: safeId(true), organizationId: safeId(true),
  opportunityId: safeId(true), hypothesisKey: safeKey(true), version: safeId(true), statement: safeText(),
  expectedMetricKeys: [safeKey()], guardrailMetricKeys: [safeKey()], targetCohortKey: safeKey(),
  expectedDirection: { type: String, enum: ['increase', 'decrease', 'maintain'] },
  minimumObservationWindowMs: { type: Number, min: 1 }, minimumSampleSize: { type: Number, min: 1 },
  status: { type: String, enum: ['draft', 'validated', 'approved', 'testing', 'supported', 'not_supported', 'inconclusive', 'cancelled', 'archived'], default: 'draft' },
  safeAssumptions: [safeText(256)], limitations: [safeText(256)], ownerReference: safeId(), ...auditFields,
}, [
  [{ pilotProgramId: 1, status: 1 }, { name: 'pilot_hypothesis_program_status' }],
  [{ hypothesisKey: 1, version: 1 }, { unique: true, name: 'pilot_hypothesis_key_version' }],
]);

const PilotExperiment = model('PilotExperiment', {
  experimentId: { ...safeId(true), unique: true }, pilotProgramId: safeId(true), organizationId: safeId(true),
  hypothesisId: safeId(true), name: safeText(120), description: safeText(), version: safeId(true),
  status: { type: String, enum: ['draft', 'validating', 'approval_required', 'approved', 'scheduled', 'running', 'paused', 'stopped', 'completed', 'inconclusive', 'cancelled', 'archived'], default: 'draft' },
  environmentCategory: { type: String, enum: ['simulation', 'local', 'integration', 'staging', 'pilot'], required: true },
  experimentType: { type: String, enum: ['feature_flag', 'onboarding_sequence', 'documentation_variant', 'default_configuration', 'notification_copy', 'quota_policy_simulation', 'operational_workflow'], required: true },
  eligibilityCohortKey: safeKey(), exclusionRules: [safeId()],
  variants: [{ key: safeKey(true), safeDescription: safeText(256) }], allocationBasisPoints: [{ type: Number, min: 0, max: 10_000 }],
  assignmentUnit: { type: String, enum: ['organization', 'workspace', 'user'], required: true },
  primaryMetricKeys: [safeKey()], secondaryMetricKeys: [safeKey()], guardrailMetricKeys: [safeKey()],
  minimumSampleSize: Number, maximumSampleSize: Number, minimumDurationMs: Number, maximumDurationMs: Number,
  stopConditions: [safeId()], successCriteria: [safeId()], failureCriteria: [safeId()], featureFlagKeys: [safeId()],
  ...auditFields,
}, [
  [{ pilotProgramId: 1, status: 1, createdAt: -1 }, { name: 'pilot_experiment_program_status' }],
  [{ hypothesisId: 1 }, { name: 'pilot_experiment_hypothesis' }],
  [{ experimentId: 1, version: 1 }, { unique: true, name: 'pilot_experiment_version' }],
  [{ environmentCategory: 1 }, { name: 'pilot_experiment_environment' }],
], { versioned: true });

const PilotExperimentAssignment = model('PilotExperimentAssignment', {
  experimentId: safeId(true), experimentVersion: safeId(true), ...pilotTenant,
  userId: safeId(), assignmentUnit: { type: String, enum: ['organization', 'workspace', 'user'], required: true },
  unitReference: safeId(true), variantKey: safeKey(true), assignmentDigestVersion: safeId(true),
  assignmentKey: safeId(true), assignedAt: Date, withdrawnAt: Date,
  status: { type: String, enum: ['assigned', 'withdrawn'], default: 'assigned' },
}, [
  [{ experimentId: 1, experimentVersion: 1, assignmentUnit: 1, unitReference: 1 }, { unique: true, name: 'pilot_experiment_assignment_unique' }],
  [{ variantKey: 1 }, { name: 'pilot_experiment_assignment_variant' }],
  [{ status: 1 }, { name: 'pilot_experiment_assignment_status' }],
]);

const PilotExperimentExposure = model('PilotExperimentExposure', {
  experimentId: safeId(true), experimentVersion: safeId(true), assignmentKey: safeId(true),
  exposureKey: safeId(true), variantKey: safeKey(true), ...pilotTenant, occurredAt: Date,
  outcomeCategory: safeId(),
}, [
  [{ experimentId: 1, assignmentKey: 1, exposureKey: 1 }, { unique: true, name: 'pilot_experiment_exposure_unique' }],
  [{ occurredAt: -1 }, { name: 'pilot_experiment_exposure_time' }],
]);

const PilotAnalyticsSnapshot = model('PilotAnalyticsSnapshot', {
  snapshotId: { ...safeId(true), unique: true }, pilotProgramId: safeId(true), organizationId: safeId(true),
  releaseCandidateId: safeId(), trackingPlanId: safeId(true), trackingPlanVersion: safeId(true),
  windowStart: Date, windowEnd: Date, summaries: mixed, safeWarnings: [safeId()],
  safeFailureCodes: [safeId()], generatedAt: Date, evidenceDigest: { ...safeId(true), immutable: true },
}, [
  [{ pilotProgramId: 1, windowStart: 1, windowEnd: 1 }, { name: 'pilot_analytics_snapshot_window' }],
  [{ releaseCandidateId: 1 }, { name: 'pilot_analytics_snapshot_release' }],
  [{ generatedAt: -1 }, { name: 'pilot_analytics_snapshot_generated' }],
]);

const PilotProductLearningEvidence = model('PilotProductLearningEvidence', {
  evidenceId: { ...safeId(true), unique: true }, pilotProgramId: safeId(true), organizationId: safeId(true),
  releaseCandidateId: safeId(), analyticsSnapshotId: safeId(true), summaries: mixed,
  approvalSummary: mixed, waiverSummary: mixed, evidenceDigest: { ...safeId(true), immutable: true },
  generatedBy: actor, generatedAt: Date, approvedAt: Date,
}, [
  [{ pilotProgramId: 1, evidenceDigest: 1 }, { unique: true, name: 'pilot_product_evidence_digest' }],
  [{ generatedAt: -1 }, { name: 'pilot_product_evidence_generated' }],
]);

const PilotAnalyticsExport = model('PilotAnalyticsExport', {
  exportId: { ...safeId(true), unique: true }, ...pilotTenant, status: safeId(),
  exportSummary: mixed, evidenceDigest: { ...safeId(true), immutable: true },
  generatedBy: actor, generatedAt: Date, expiresAt: Date,
}, [[{ pilotProgramId: 1, organizationId: 1, createdAt: -1 }, { name: 'pilot_analytics_export_scope' }]]);

const PilotAnalyticsBackfill = model('PilotAnalyticsBackfill', {
  backfillId: { ...safeId(true), unique: true }, ...pilotTenant,
  sourceCategory: safeId(true), status: { type: String, enum: ['requested', 'running', 'paused', 'completed', 'failed', 'cancelled'], default: 'requested' },
  windowStart: Date, windowEnd: Date, checkpoint: { type: Number, min: 0, default: 0 },
  maximumRecords: { type: Number, min: 1, max: 100_000 }, processedCount: { type: Number, min: 0 },
  approvalRequestId: safeId(), safeFailureCode: safeId(), ...auditFields,
}, [
  [{ pilotProgramId: 1, status: 1 }, { name: 'pilot_analytics_backfill_program_status' }],
  [{ checkpoint: 1 }, { name: 'pilot_analytics_backfill_checkpoint' }],
  [{ createdAt: -1 }, { name: 'pilot_analytics_backfill_created' }],
]);

module.exports = {
  AnalyticsInstrumentationCoverage,
  AnalyticsTrackingPlan,
  PilotAnalyticsBackfill,
  PilotAnalyticsEvent,
  PilotAnalyticsExport,
  PilotAnalyticsProjection,
  PilotAnalyticsSnapshot,
  PilotCohortDefinition,
  PilotExperiment,
  PilotExperimentAssignment,
  PilotExperimentExposure,
  PilotFeedbackTheme,
  PilotFunnelDefinition,
  PilotMetricDefinition,
  PilotProductHypothesis,
  PilotProductLearningEvidence,
  PilotProductOpportunity,
};
