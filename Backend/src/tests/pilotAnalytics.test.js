const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const core = require('../services/pilotAnalyticsCore.service');
const metrics = require('../services/pilotAnalyticsMetrics.service');
const analyticsModels = require('../models/pilotAnalyticsModels');
const { ANALYTICS_EVENT_DEFINITIONS, CORE_METRIC_DEFINITIONS, FUNNEL_DEFINITIONS } = require('../constants/pilotAnalytics');
const { getPermission } = require('../constants/permissionRegistry');

const NOW = new Date('2026-07-23T00:00:00.000Z');
const TRUSTED = {
  pilotProgramId: 'pilot-test',
  organizationId: 'tenant-a',
  workspaceId: 'workspace-a',
  subjectReference: 'user-a',
  collectionState: 'pilot_standard',
  sourceCategory: 'simulation',
};
const SECRET = 'pilot-analytics-test-secret';

function prepare(input = {}, trusted = TRUSTED) {
  return core.prepareEvent({
    eventKey: 'pilot.onboarding.started',
    subjectReference: 'user-a',
    idempotencyKey: 'event-1',
    organizationId: trusted.organizationId,
    workspaceId: trusted.workspaceId,
    occurredAt: '2026-07-22T00:00:00.000Z',
    properties: {},
    ...input,
  }, trusted, { now: NOW, pseudonymSecret: SECRET });
}

test('event registry is static, complete, and rejects arbitrary keys and properties', () => {
  assert.ok(ANALYTICS_EVENT_DEFINITIONS.length >= 60);
  assert.equal(new Set(ANALYTICS_EVENT_DEFINITIONS.map((item) => item.eventKey)).size, ANALYTICS_EVENT_DEFINITIONS.length);
  assert.throws(() => core.getEventDefinition('custom.event'), (error) => error.code === 'ANALYTICS_EVENT_NOT_REGISTERED');
  assert.throws(() => prepare({ properties: { custom: true } }), (error) => error.code === 'ANALYTICS_PROPERTY_NOT_REGISTERED');
});

test('event validation bounds size, depth, arrays, strings, prototypes, and executable objects', () => {
  const definition = core.getEventDefinition('pilot.onboarding.started');
  assert.throws(() => core.validateProperties(definition, { safeFailureCode: 'x'.repeat(257) }), (error) => error.code === 'ANALYTICS_STRING_TOO_LONG');
  assert.throws(() => core.validateProperties(definition, { safeFailureCode: ['x'].concat(Array(16).fill('y')) }), (error) => error.code === 'ANALYTICS_ARRAY_TOO_LONG');
  assert.throws(() => core.validateProperties(definition, { safeFailureCode: new Date() }), (error) => error.code === 'ANALYTICS_EXECUTABLE_OBJECT_FORBIDDEN');
  const prototypePayload = Object.create(null);
  prototypePayload.__proto__ = 'polluted';
  assert.throws(() => core.validateProperties(definition, prototypePayload), (error) => ['ANALYTICS_PROPERTY_NOT_REGISTERED', 'ANALYTICS_PROTOTYPE_KEY_FORBIDDEN'].includes(error.code));
  const deeplyNested = { statusCategory: { a: { b: { c: { d: true } } } } };
  assert.throws(() => core.validateProperties(definition, deeplyNested), (error) => error.code === 'ANALYTICS_OBJECT_DEPTH_EXCEEDED');
  assert.throws(() => core.validateProperties({ ...definition, maximumSerializedBytes: 8 }, { safeFailureCode: 'bounded' }), (error) => error.code === 'ANALYTICS_EVENT_TOO_LARGE');
});

test('secrets, credentials, raw model data, and unrestricted orchestration data are rejected', () => {
  for (const [property, value] of [
    ['safeFailureCode', 'Bearer synthetic-token-123456789'],
    ['safeFailureCode', 'mongodb+srv://user:password@example.invalid/db'],
    ['rawPrompt', 'hello'],
    ['rawResponse', 'answer'],
    ['hiddenReasoning', 'private'],
    ['orchestrationInput', { value: true }],
    ['orchestrationOutput', { value: true }],
    ['runtimeToken', 'synthetic'],
    ['installKey', 'synthetic'],
  ]) {
    assert.throws(() => prepare({ properties: { [property]: value } }), (error) => ['ANALYTICS_PROHIBITED_PROPERTY', 'ANALYTICS_PROPERTY_NOT_REGISTERED', 'ANALYTICS_SECRET_VALUE_FORBIDDEN'].includes(error.code));
  }
});

test('trusted scope prevents tenant, workspace, and release identity forgery', () => {
  assert.throws(() => prepare({ organizationId: 'tenant-b' }), (error) => error.code === 'ANALYTICS_CROSS_TENANT_SCOPE');
  assert.throws(() => prepare({ workspaceId: 'workspace-b' }), (error) => error.code === 'ANALYTICS_CROSS_WORKSPACE_SCOPE');
  assert.throws(() => core.prepareEvent({
    eventKey: 'pilot.onboarding.started', subjectReference: 'user-a', idempotencyKey: 'release-forge',
    organizationId: 'tenant-a', workspaceId: 'workspace-a', releaseVersion: 'forged', properties: {},
  }, { ...TRUSTED, releaseVersion: 'trusted' }, { now: NOW, pseudonymSecret: SECRET }), (error) => error.code === 'ANALYTICS_RELEASE_SCOPE_FORGED');
});

test('tenant-scoped pseudonyms and deduplication are deterministic and isolated', () => {
  const first = prepare();
  const replay = prepare();
  const otherWorkspace = prepare({ workspaceId: 'workspace-b' }, { ...TRUSTED, workspaceId: 'workspace-b' });
  assert.equal(first.deduplicationKey, replay.deduplicationKey);
  assert.notEqual(first.deduplicationKey, otherWorkspace.deduplicationKey);
  assert.equal(first.anonymousSubjectKey, replay.anonymousSubjectKey);
  assert.notEqual(first.anonymousSubjectKey, otherWorkspace.anonymousSubjectKey);
  assert.doesNotMatch(first.anonymousSubjectKey, /user-a/);
});

test('consent and collection modes preserve minimal operations and honor withdrawal', () => {
  assert.equal(core.consentAllows('minimal_operational', core.getEventDefinition('pilot.provider.unavailable')), true);
  assert.equal(core.consentAllows('minimal_operational', core.getEventDefinition('pilot.onboarding.started')), false);
  assert.equal(core.consentAllows('withdrawn', core.getEventDefinition('pilot.provider.unavailable')), false);
  assert.throws(() => prepare({}, { ...TRUSTED, collectionState: 'withdrawn' }), (error) => error.code === 'ANALYTICS_COLLECTION_DISABLED');
});

test('tracking plan and metric validation enforce registered definitions and denominators', () => {
  assert.equal(core.validateTrackingPlan({
    scope: 'pilot_program', collectionMode: 'standard',
    eventDefinitionKeys: ['pilot.onboarding.started'], requiredEventDefinitionKeys: ['pilot.onboarding.started'],
    allowedClassifications: ['onboarding_progress'], maximumEventBytes: 8_192,
  }).valid, true);
  assert.equal(core.validateTrackingPlan({
    scope: 'pilot_program', collectionMode: 'standard',
    eventDefinitionKeys: ['arbitrary'], requiredEventDefinitionKeys: [],
    allowedClassifications: ['onboarding_progress'], maximumEventBytes: 8_192,
  }).valid, false);
  assert.equal(core.validateMetricDefinition({ metricKey: 'rate', unit: 'rate', denominatorEventKeys: [], missingDataBehavior: 'unknown' }).valid, false);
  assert.ok(CORE_METRIC_DEFINITIONS.every((item) => !['rate', 'percentage'].includes(item.unit) || item.denominatorEventKeys.length));
  assert.deepEqual(core.boundedPercentage(1, null), { state: 'unknown', value: null, numerator: 1, denominator: null });
  assert.equal(core.boundedPercentage(1, 2, 5).state, 'insufficient_data');
  assert.equal(core.boundedPercentage(1, 2, 1).value, 50);
});

test('funnels report denominators and classify provider blocks outside voluntary dropoff', () => {
  const events = [
    prepare({ eventKey: 'pilot.capability.list_viewed', idempotencyKey: '1' }),
    prepare({ eventKey: 'pilot.capability.detail_viewed', idempotencyKey: '2' }),
    prepare({ eventKey: 'pilot.grounded_research.denied_provider', idempotencyKey: '3' }, { ...TRUSTED, capabilityKey: 'external.grounded_research', safeFailureCode: 'PROVIDER_UNAVAILABLE' }),
  ];
  const result = core.evaluateFunnel(events, FUNNEL_DEFINITIONS.capability);
  assert.equal(result.denominator, 1);
  assert.ok(result.steps.some((step) => step.providerBlocked > 0));
  assert.equal(result.steps.at(-1).dropOff, 0);
});

test('cohort retention suppresses small groups and reports missing data honestly', () => {
  const entry = [prepare({ idempotencyKey: 'entry-a', occurredAt: '2026-07-10T00:00:00.000Z' })];
  const activity = [prepare({ idempotencyKey: 'activity-a', occurredAt: '2026-07-11T00:00:00.000Z' })];
  assert.equal(core.evaluateRetention({ entryEvents: entry, activityEvents: activity, minimumCohortSize: 5 }).state, 'suppressed_small_cohort');
  assert.equal(core.evaluateRetention({ entryEvents: entry, activityEvents: activity, minimumCohortSize: 1 }).periods.day1.state, 'available');
});

test('behavioral adoption segments never infer demographics or intent from provider blocks', () => {
  assert.equal(core.adoptionSegment({ providerBlocked: true }), 'platform_blocked');
  assert.equal(core.adoptionSegment({ gateBlocked: true }), 'gate_blocked');
  assert.equal(core.adoptionSegment({ onboardingStarted: true, onboardingCompleted: true, repeatUse: true }), 'repeat_user');
  assert.equal(core.adoptionSegment({}), 'not_onboarded');
});

test('instrumentation coverage and data quality distinguish definitions, observations, gaps, and duplicates', () => {
  const required = ['pilot.onboarding.started', 'pilot.orchestration.run_completed'];
  const incomplete = core.instrumentationCoverage({ requiredEventDefinitionKeys: required, events: [prepare()], now: NOW });
  assert.equal(incomplete.status, 'incomplete');
  assert.deepEqual(incomplete.missingEventDefinitionKeys, ['pilot.orchestration.run_completed']);
  const quality = core.evaluateDataQuality({ duplicateCount: 1, sequenceGapCount: 1, instrumentationStatus: 'incomplete', now: NOW });
  assert.equal(quality.status, 'degraded');
  assert.ok(quality.safeWarnings.includes('SOURCE_SEQUENCE_GAPS'));
});

test('projections rebuild, checkpoint, resume, and replay idempotently', () => {
  const events = [1, 2, 3].map((sequence) => prepare({ idempotencyKey: `p-${sequence}`, sequence }));
  const first = core.projectEvents(events, { batchSize: 2, interruptAfterBatch: true });
  assert.equal(first.status, 'interrupted');
  const resumed = core.projectEvents(events, { checkpoint: first.checkpoint, existing: first.projections });
  const replay = core.projectEvents(events, { existing: resumed.projections });
  assert.deepEqual(replay.projections, resumed.projections);
  assert.deepEqual(core.backfillCheckpoint({ checkpoint: 10, processed: 5, maximumBatchSize: 10 }), { checkpoint: 15, status: 'running', restartSafe: true });
});

test('feedback classification is deterministic and themes omit raw text', () => {
  assert.deepEqual(core.feedbackTaxonomy({ selectedCategory: 'quota_friction' }), { category: 'quota_friction', source: 'submitter_selected', confirmed: true });
  assert.equal(core.feedbackTaxonomy({ safeText: 'Provider returned unavailable' }).category, 'provider_availability');
  const themes = core.aggregateFeedbackThemes([{ category: 'quota_friction', organizationId: 'tenant-a', rawText: 'private transcript' }], { pilotProgramId: 'pilot-test' });
  assert.equal(JSON.stringify(themes).includes('private transcript'), false);
  assert.equal(core.feedbackPriority({ crossTenantFinding: true }), 'urgent');
});

test('opportunities, hypotheses, and experiments remain evidence linked and governed', () => {
  assert.ok(core.opportunityScore({ impactCategory: 'high', confidenceCategory: 'high', effortCategory: 'low', riskCategory: 'low' }).score > 0);
  assert.equal(core.validateHypothesis({ hypothesisKey: 'docs_test', expectedMetricKeys: ['onboarding_completion_rate'], guardrailMetricKeys: ['credential_exposure_finding_count'], expectedDirection: 'increase' }).valid, true);
  const experiment = { experimentId: 'exp', version: '1', environmentCategory: 'simulation', variants: [{ key: 'a' }, { key: 'b' }], allocationBasisPoints: [5_000, 5_000], assignmentUnit: 'workspace', featureFlagKeys: [] };
  assert.equal(core.validateExperiment(experiment).valid, true);
  for (const key of ['authorization', 'tenant_isolation', 'encryption', 'stale_writer_fencing', 'data_residency', 'external.grounded_research']) {
    assert.equal(core.validateExperiment({ ...experiment, featureFlagKeys: [key] }).valid, false);
  }
});

test('experiment assignment is stable, tenant scoped, and distinct from exposure', () => {
  const experiment = { experimentId: 'exp', version: '1', environmentCategory: 'simulation', variants: [{ key: 'a' }, { key: 'b' }], allocationBasisPoints: [5_000, 5_000], assignmentUnit: 'workspace', featureFlagKeys: [] };
  const first = core.assignExperiment({ experiment, organizationId: 'tenant-a', unitReference: 'workspace-a' }, SECRET);
  const replay = core.assignExperiment({ experiment, organizationId: 'tenant-a', unitReference: 'workspace-a' }, SECRET);
  const other = core.assignExperiment({ experiment, organizationId: 'tenant-b', unitReference: 'workspace-a' }, SECRET);
  assert.deepEqual(first, replay);
  assert.equal(first.exposed, false);
  assert.notEqual(first.assignmentKey, other.assignmentKey);
  const exposure = core.recordExposure([], { experimentId: 'exp', experimentVersion: '1', assignmentKey: first.assignmentKey, variantKey: first.variantKey, eligible: true, renderedOrApplied: true, featureAvailable: true, gatePermitted: true, excluded: false, collectionAllowed: true });
  assert.equal(exposure.recorded, true);
  assert.equal(core.recordExposure(exposure.exposures, { experimentId: 'exp', experimentVersion: '1', assignmentKey: first.assignmentKey, variantKey: first.variantKey, eligible: true, renderedOrApplied: true, featureAvailable: true, gatePermitted: true, excluded: false, collectionAllowed: true }).duplicate, true);
});

test('security guardrails stop experiments and deterministic evaluation discloses denominator', () => {
  const stopped = core.evaluateExperiment({ guardrails: { cross_tenant_finding: 1 }, exposedCount: 8, minimumSampleSize: 5 });
  assert.equal(stopped.result, 'stopped_guardrail');
  assert.equal(stopped.guardrails.securityControlsPreserved, true);
  const result = core.evaluateExperiment({ guardrails: {}, exposedCount: 10, minimumSampleSize: 5, controlRate: 0.2, treatmentRate: 0.4, minimumMeaningfulDelta: 0.01, environmentCategory: 'simulation' });
  assert.equal(result.result, 'positive');
  assert.equal(result.denominator, 10);
  assert.equal(result.causalClaim, false);
});

test('provider outage, friction, recommendations, and readiness preserve blocked gate state', () => {
  const event = prepare({ eventKey: 'pilot.grounded_research.denied_provider', idempotencyKey: 'provider' }, { ...TRUSTED, capabilityKey: 'external.grounded_research', safeFailureCode: 'PROVIDER_UNAVAILABLE' });
  const impact = core.providerOutageImpact({ events: [event], capabilityGateStatus: 'blocked_provider_unavailable' });
  assert.equal(impact.voluntaryAbandonmentCount, 0);
  assert.equal(core.classifyFriction({ providerUnavailable: true }), 'provider_unavailable');
  assert.ok(core.adoptionRecommendations({ providerImpact: impact, instrumentationStatus: 'complete' }).some((item) => item.recommendationKey === 'provider_gate_must_pass'));
  const readiness = core.expansionReadiness({ onboardingStatus: 'healthy', reliabilityStatus: 'healthy', capacityHeadroomStatus: 'healthy', dataQualityStatus: 'healthy', coreCapabilityGateStatus: 'passed', groundedResearchGateStatus: 'blocked_provider_unavailable' });
  assert.equal(readiness.coreOrchestration, 'ready');
  assert.equal(readiness.groundedResearch, 'blocked');
  assert.equal(readiness.automaticExpansion, false);
});

test('snapshots, evidence, and exports are immutable, digested, bounded, and redacted', () => {
  const snapshot = core.analyticsSnapshot({ pilotProgramId: 'pilot-test', generatedAt: NOW.toISOString(), rawPrompt: 'private', authorization: 'Bearer synthetic-token-123456789' });
  const evidence = core.productLearningEvidence({ snapshotDigest: snapshot.evidenceDigest, generatedAt: NOW.toISOString(), hiddenReasoning: 'private' });
  const exported = core.safeAnalyticsExport({ aggregatedUsage: { count: 1 }, rawPrompt: 'private', userId: 'user-a', authorization: 'Bearer synthetic-token-123456789', generatedAt: NOW.toISOString() });
  assert.ok(Object.isFrozen(snapshot));
  assert.match(snapshot.evidenceDigest, /^sha256:/);
  assert.match(evidence.evidenceDigest, /^sha256:/);
  assert.doesNotMatch(JSON.stringify({ snapshot, evidence, exported }), /private|synthetic-token|user-a/);
});

test('retention deletion is scoped, idempotent, and preserves audit evidence and legal holds', () => {
  const records = [
    { id: 'event-a', organizationId: 'tenant-a', workspaceId: 'workspace-a' },
    { id: 'audit-a', organizationId: 'tenant-a', workspaceId: 'workspace-a', auditEvidence: true },
    { id: 'event-b', organizationId: 'tenant-b', workspaceId: 'workspace-b' },
  ];
  const result = core.deleteEligibleAnalytics(records, { organizationId: 'tenant-a', workspaceId: 'workspace-a' });
  assert.deepEqual(result.deletedKeys, ['event-a']);
  assert.equal(result.retained.length, 2);
  assert.equal(core.deletionEligibility(records[0], { legalHoldActive: true }).eligible, false);
});

test('analytics infrastructure metrics discard high-cardinality identifiers', () => {
  metrics.reset();
  metrics.increment('analytics_events_accepted', { event_domain: 'onboarding', organizationId: 'tenant-a', workspaceId: 'workspace-a', requestId: 'request-a' });
  assert.deepEqual(metrics.snapshot()[0].labels, { event_domain: 'onboarding' });
});

test('models define tenant, deduplication, expiry, projection, experiment, and evidence indexes', () => {
  const indexes = (Model) => Model.schema.indexes().map(([fields, options]) => ({ fields, options }));
  assert.ok(indexes(analyticsModels.PilotAnalyticsEvent).some(({ fields, options }) => fields.organizationId === 1 && fields.workspaceId === 1 && fields.deduplicationKey === 1 && options.unique));
  assert.ok(indexes(analyticsModels.PilotAnalyticsEvent).some(({ fields, options }) => fields.expiresAt === 1 && options.expireAfterSeconds === 0));
  assert.ok(indexes(analyticsModels.PilotAnalyticsProjection).some(({ fields }) => fields.pilotProgramId === 1 && fields.windowStart === -1));
  assert.ok(indexes(analyticsModels.PilotExperimentAssignment).some(({ options }) => options.name === 'pilot_experiment_assignment_unique' && options.unique));
  assert.ok(indexes(analyticsModels.PilotProductLearningEvidence).some(({ fields }) => fields.evidenceDigest === 1));
});

test('RBAC and API surface protect every pilot analytics route', () => {
  for (const permission of [
    'pilotAnalytics.read', 'pilotAnalytics.export', 'analyticsTrackingPlan.activate',
    'analyticsEvent.ingest', 'pilotMetricDefinition.activate', 'pilotFunnel.evaluate',
    'pilotCohort.evaluate', 'pilotExperiment.approve', 'pilotAnalyticsBackfill.create',
  ]) assert.ok(getPermission(permission));
  const routes = fs.readFileSync(path.resolve(__dirname, '../routes/pilotAnalyticsRoutes.js'), 'utf8');
  const service = fs.readFileSync(path.resolve(__dirname, '../services/pilotAnalytics.service.js'), 'utf8');
  assert.match(routes, /pilotAnalyticsRouter\.use\(authenticatePartner\)/);
  assert.match(routes, /requiresPermission/);
  assert.match(service, /enforceApproval/);
  assert.match(service, /createAuditLog/);
  assert.doesNotMatch(routes, /gemini|providerApiKey/);
});
