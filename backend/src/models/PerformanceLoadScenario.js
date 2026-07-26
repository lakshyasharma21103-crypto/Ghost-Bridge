const mongoose = require('mongoose');
const {
  PERFORMANCE_LIMITS,
  PERFORMANCE_TEST_MODES,
  TRAFFIC_MODELS,
  WORKLOAD_DOMAIN_IDS,
} = require('../constants/performanceCapacity');
const { BACKPRESSURE_STATES } = require('../constants/productionScale');

const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_CODE = /^[A-Z0-9][A-Z0-9_:-]{0,127}$/;
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key)/i.test(String(value || ''));
const countValidator = (maximum, minimum = 0) => ({
  validator: (items) => Array.isArray(items) && items.length >= minimum && items.length <= maximum,
  message: `Array must contain between ${minimum} and ${maximum} items.`,
});

const requestMixSchema = new mongoose.Schema(
  {
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true },
    weightBasisPoints: { type: Number, required: true, min: 1, max: 10_000 },
  },
  { _id: false, strict: 'throw' },
);

const conditionSchema = new mongoose.Schema(
  {
    conditionType: {
      type: String,
      enum: [
        'correctness_violation', 'security_violation', 'cross_tenant_response',
        'credential_pattern', 'unexpected_failure_rate', 'database_unavailable',
        'queue_depth_hard_limit', 'lease_expiry_hard_limit', 'memory_critical',
        'target_unavailable', 'manual_cancellation', 'regional_split_brain_risk',
        'cleanup_failure_risk',
      ],
      required: true,
    },
    threshold: { type: Number, min: 0, max: 1_000_000_000 },
    safeReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE },
    enabled: { type: Boolean, required: true, default: true },
  },
  { _id: false, strict: 'throw' },
);

const rampPointSchema = new mongoose.Schema(
  {
    stageName: { type: String, trim: true, maxlength: 200, match: SAFE_TOKEN },
    order: { type: Number, min: 1, max: PERFORMANCE_LIMITS.maximumStages },
    offsetMs: { type: Number, min: 0, max: PERFORMANCE_LIMITS.maximumDurationMs },
    durationMs: { type: Number, min: 1, max: PERFORMANCE_LIMITS.maximumStageDurationMs },
    targetConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency },
    targetRequestsPerSecond: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumRequestsPerSecond },
    workloadMixOverrides: { type: [requestMixSchema], default: undefined },
    expectedBackpressureState: { type: String, enum: [...BACKPRESSURE_STATES, 'any'] },
    expectedAdmissionOutcomeCategory: { type: String, enum: ['accepted', 'deferred', 'rejected', 'mixed', 'any'] },
  },
  { _id: false, strict: 'throw' },
);

const stageSchema = new mongoose.Schema(
  {
    stageName: { type: String, required: true, trim: true, maxlength: 200, match: SAFE_TOKEN },
    order: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumStages },
    durationMs: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumStageDurationMs },
    targetConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency },
    targetRequestsPerSecond: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumRequestsPerSecond },
    workloadMixOverrides: { type: [requestMixSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumRequestMixEntries) },
    expectedBackpressureState: { type: String, enum: [...BACKPRESSURE_STATES, 'any'] },
    expectedAdmissionOutcomeCategory: { type: String, enum: ['accepted', 'deferred', 'rejected', 'mixed', 'any'] },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true },
    organizationId: { type: String, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: ['draft', 'active', 'archived'], required: true, default: 'draft' },
    testMode: { type: String, enum: PERFORMANCE_TEST_MODES, required: true },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true },
    criticality: { type: String, enum: ['low', 'standard', 'high', 'critical'], required: true, default: 'standard' },
    trafficModel: { type: String, enum: TRAFFIC_MODELS, required: true },
    targetId: { type: String, trim: true, match: SAFE_TOKEN },
    durationMs: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumDurationMs },
    warmupDurationMs: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumDurationMs, default: 0 },
    steadyStateDurationMs: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumDurationMs },
    cooldownDurationMs: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumDurationMs, default: 0 },
    targetConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency },
    maximumConcurrency: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency },
    targetRequestsPerSecond: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumRequestsPerSecond },
    maximumRequestsPerSecond: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumRequestsPerSecond },
    rampProfile: { type: [rampPointSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumStages) },
    stageDefinitions: { type: [stageSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumStages) },
    tenantCount: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumTenantCount, default: 1 },
    workspaceCount: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumWorkspaceCount, default: 1 },
    userCount: { type: Number, required: true, min: 1, max: PERFORMANCE_LIMITS.maximumUserCount, default: 1 },
    orchestrationDefinitionCount: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumFixtureCount, default: 0 },
    mockAgentCount: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumFixtureCount, default: 0 },
    workerCount: { type: Number, required: true, min: 0, max: PERFORMANCE_LIMITS.maximumConcurrency, default: 0 },
    requestMix: { type: [requestMixSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumRequestMixEntries) },
    failureInjectionProfileId: { type: String, trim: true, maxlength: 200 },
    regionalSimulationProfileId: { type: String, trim: true, maxlength: 200 },
    fixtureProfile: { type: String, required: true, trim: true, match: SAFE_TOKEN, default: 'bounded_default' },
    fixtureSeed: { type: Number, required: true, min: 1, max: 2_147_483_647 },
    performanceBudgetPolicyId: { type: String, trim: true, maxlength: 200 },
    performanceBudgetPolicyVersion: { type: Number, min: 1, max: 1_000_000 },
    dataClassification: { type: String, enum: ['synthetic', 'internal_test'], required: true, default: 'synthetic' },
    residencyTag: { type: String, required: true, trim: true, match: SAFE_TOKEN, default: 'synthetic-local' },
    cleanupPolicy: { type: String, required: true, trim: true, match: SAFE_TOKEN, default: 'fixture_set_scoped' },
    stopConditions: { type: [conditionSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumStopConditions) },
    abortConditions: { type: [conditionSchema], default: [], validate: countValidator(PERFORMANCE_LIMITS.maximumStopConditions) },
    validation: {
      valid: Boolean,
      safeReasonCodes: { type: [{ type: String, trim: true, match: SAFE_CODE }], default: [], validate: countValidator(32) },
      validatedAt: Date,
    },
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: Date,
    archivedAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('scope').validate(function validateScope(scope) {
  if (scope === 'platform') return !this.organizationId && !this.workspaceId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  return Boolean(this.organizationId) && Boolean(this.workspaceId);
}, 'Scenario scope identifiers are inconsistent.');
schema.path('description').validate(SAFE_TEXT, 'Scenario descriptions must not contain credentials or connection data.');
schema.path('durationMs').validate(function validateStageDuration(durationMs) {
  return this.warmupDurationMs + this.steadyStateDurationMs + this.cooldownDurationMs <= durationMs;
}, 'Warmup, steady-state and cooldown durations must fit within durationMs.');
schema.path('targetConcurrency').validate(function validateConcurrency(value) { return value <= this.maximumConcurrency; }, 'Target concurrency exceeds its maximum.');
schema.path('targetRequestsPerSecond').validate(function validateRate(value) { return value <= this.maximumRequestsPerSecond; }, 'Target request rate exceeds its maximum.');
schema.path('stageDefinitions').validate((stages) => new Set(stages.map((stage) => stage.order)).size === stages.length, 'Stage order values must be unique.');

schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'performance_scenario_scope_status' });
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, name: 1, version: 1 }, { unique: true, name: 'performance_scenario_scope_name_version' });
schema.index({ workloadDomain: 1, status: 1 }, { name: 'performance_scenario_workload_status' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'performance_scenario_idempotency' });

module.exports = mongoose.models.PerformanceLoadScenario || mongoose.model('PerformanceLoadScenario', schema);
