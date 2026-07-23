const assert = require('node:assert/strict');
const core = require('../src/services/pilotAnalyticsCore.service');
const metrics = require('../src/services/pilotAnalyticsMetrics.service');
const {
  ANALYTICS_EVENT_DEFINITIONS,
  CORE_METRIC_DEFINITIONS,
  FUNNEL_DEFINITIONS,
} = require('../src/constants/pilotAnalytics');

function pass(label) {
  process.stdout.write(`PASS ${label}\n`);
}

function containsForbidden(value) {
  return /(?:bearer\s+synthetic|rawPrompt|rawResponse|hiddenReasoning|mongodb\+srv:\/\/|runtimeToken|installKey|providerApiKey)/i.test(JSON.stringify(value));
}

function expectedError(operation, code) {
  assert.throws(operation, (error) => error.code === code);
}

async function run() {
  const now = new Date('2026-07-23T10:00:00.000Z');
  const tenant = { pilotProgramId: 'pilot-14b', organizationId: 'synthetic-org-a', workspaceId: 'synthetic-ws-a' };
  const secondWorkspace = { ...tenant, workspaceId: 'synthetic-ws-b' };
  const secret = 'synthetic-tenant-pseudonym-secret-v1';
  const trackingPlan = {
    scope: 'pilot_program',
    eventDefinitionKeys: ANALYTICS_EVENT_DEFINITIONS.map((definition) => definition.eventKey),
    requiredEventDefinitionKeys: [
      'pilot.onboarding.started',
      'pilot.connection.install_completed',
      'pilot.orchestration.run_submitted',
      'pilot.orchestration.run_completed',
    ],
    collectionMode: 'standard',
    allowedClassifications: ['operational_metadata', 'product_usage', 'onboarding_progress', 'capability_usage', 'performance_summary', 'reliability_summary', 'support_summary', 'feedback_summary', 'experiment_exposure', 'experiment_outcome'],
    maximumEventBytes: 8_192,
  };
  assert.equal(core.validateTrackingPlan(trackingPlan).valid, true);
  pass('analytics tracking plan');
  assert.ok(ANALYTICS_EVENT_DEFINITIONS.length >= 60);
  assert.ok(CORE_METRIC_DEFINITIONS.every((metric) => !['percentage', 'rate'].includes(metric.unit) || metric.denominatorEventKeys.length));
  pass('analytics event registry');

  expectedError(() => core.getEventDefinition('pilot.client.arbitrary'), 'ANALYTICS_EVENT_NOT_REGISTERED');
  pass('arbitrary event rejected');
  expectedError(() => core.validateProperties(core.getEventDefinition('pilot.onboarding.started'), { arbitrary: true }), 'ANALYTICS_PROPERTY_NOT_REGISTERED');
  pass('event schema validation');

  let sequence = 0;
  const events = [];
  function event(eventKey, subjectReference, occurredAt, properties = {}, extra = {}, trustedScope = tenant) {
    sequence += 1;
    const prepared = core.prepareEvent({
      eventKey,
      eventVersion: '1',
      subjectType: extra.subjectType || 'pilot_user',
      subjectReference,
      idempotencyKey: extra.idempotencyKey || `evt-${sequence}`,
      sequence,
      occurredAt,
      properties,
      capabilityKey: extra.capabilityKey,
      organizationId: trustedScope.organizationId,
      workspaceId: trustedScope.workspaceId,
    }, {
      ...trustedScope,
      subjectReference,
      collectionState: 'pilot_standard',
      allowedClassifications: trackingPlan.allowedClassifications,
      releaseCandidateId: 'rc-14b',
      releaseVersion: '14.2.0',
      featureFlagSnapshotVersion: 'ff-14b',
      capabilityKey: extra.capabilityKey,
      capabilityGateStatus: extra.capabilityGateStatus,
      safeFailureCode: extra.safeFailureCode,
      sourceCategory: 'simulation',
      requestId: `request-${sequence}`,
      traceId: `trace-${sequence}`,
    }, { now, pseudonymSecret: secret });
    events.push(prepared);
    return prepared;
  }

  const userA = 'synthetic-user-a';
  const userB = 'synthetic-user-b';
  const day0 = '2026-07-15T10:00:00.000Z';
  for (const [key, time, props] of [
    ['pilot.enrollment.approved', '2026-07-15T10:00:00.000Z', {}],
    ['pilot.onboarding.started', '2026-07-15T10:01:00.000Z', {}],
    ['pilot.roles.assigned', '2026-07-15T10:02:00.000Z', { roleCategory: 'pilot_builder' }],
    ['pilot.capability_restrictions.acknowledged', '2026-07-15T10:03:00.000Z', {}],
    ['pilot.passport.list_viewed', '2026-07-15T10:04:00.000Z', {}],
    ['pilot.connection.install_completed', '2026-07-15T10:05:00.000Z', { successful: true }],
    ['pilot.orchestration.definition_created', '2026-07-15T10:06:00.000Z', {}],
    ['pilot.orchestration.definition_validated', '2026-07-15T10:07:00.000Z', {}],
    ['pilot.orchestration.definition_activated', '2026-07-15T10:08:00.000Z', {}],
    ['pilot.orchestration.run_submitted', '2026-07-15T10:09:00.000Z', {}],
    ['pilot.orchestration.run_accepted', '2026-07-15T10:09:05.000Z', {}],
    ['pilot.orchestration.run_started', '2026-07-15T10:09:10.000Z', {}],
    ['pilot.orchestration.run_completed', '2026-07-15T10:10:00.000Z', { successful: true }],
    ['pilot.onboarding.completed', '2026-07-15T10:11:00.000Z', {}],
    ['pilot.onboarding.approved', '2026-07-15T10:12:00.000Z', {}],
  ]) event(key, userA, time, props);
  event('pilot.capability.list_viewed', userA, '2026-07-15T10:13:00.000Z', {}, { capabilityKey: 'orchestration.core' });
  event('pilot.capability.detail_viewed', userA, '2026-07-15T10:14:00.000Z', {}, { capabilityKey: 'orchestration.core' });
  event('pilot.capability.access_requested', userA, '2026-07-15T10:15:00.000Z', {}, { capabilityKey: 'orchestration.core' });
  event('pilot.capability.first_used', userA, '2026-07-15T10:16:00.000Z', { successful: true }, { capabilityKey: 'orchestration.core' });
  event('pilot.capability.repeated_use', userA, '2026-07-16T10:16:00.000Z', { repeated: true }, { capabilityKey: 'orchestration.core' });
  for (const key of ['pilot.delegation.requested', 'pilot.delegation.approved', 'pilot.delegation.invoked', 'pilot.delegation.completed', 'pilot.recovery.started', 'pilot.recovery.completed', 'pilot.compensation.started', 'pilot.compensation.completed', 'pilot.approval.requested', 'pilot.approval.completed']) {
    event(key, userA, `2026-07-16T${String(sequence % 20).padStart(2, '0')}:20:00.000Z`, {});
  }
  event('pilot.feedback.submitted', userA, '2026-07-17T10:00:00.000Z', { feedbackCategory: 'missing_documentation' });
  event('pilot.support_case.created', userA, '2026-07-17T10:01:00.000Z', { supportCategory: 'onboarding' });
  event('pilot.provider.unavailable', userA, '2026-07-17T10:02:00.000Z', { providerState: 'unavailable' }, { capabilityKey: 'external.grounded_research', capabilityGateStatus: 'blocked_provider_unavailable' });
  event('pilot.grounded_research.denied_provider', userA, '2026-07-17T10:03:00.000Z', { providerState: 'unavailable', gateState: 'blocked' }, { capabilityKey: 'external.grounded_research', capabilityGateStatus: 'blocked_provider_unavailable', safeFailureCode: 'PROVIDER_UNAVAILABLE' });
  assert.ok(events.every((item) => item.organizationId === tenant.organizationId && item.workspaceId === tenant.workspaceId));
  pass('tenant-scoped event ingestion');

  const original = events[0];
  const duplicate = core.prepareEvent({
    eventKey: original.eventKey,
    subjectReference: userA,
    idempotencyKey: original.idempotencyKey,
    occurredAt: day0,
    properties: {},
    organizationId: tenant.organizationId,
    workspaceId: tenant.workspaceId,
  }, { ...tenant, subjectReference: userA, collectionState: 'pilot_standard', allowedClassifications: trackingPlan.allowedClassifications, sourceCategory: 'simulation' }, { now, pseudonymSecret: secret });
  assert.equal(original.deduplicationKey, duplicate.deduplicationKey);
  assert.equal(new Set([...events, duplicate].map((item) => item.deduplicationKey)).size, events.length);
  pass('event deduplication');

  expectedError(() => core.prepareEvent({
    eventKey: 'pilot.onboarding.started', subjectReference: userA, idempotencyKey: 'cross-tenant',
    organizationId: 'synthetic-org-b', workspaceId: tenant.workspaceId, properties: {},
  }, { ...tenant, subjectReference: userA, collectionState: 'pilot_standard' }, { now, pseudonymSecret: secret }), 'ANALYTICS_CROSS_TENANT_SCOPE');
  expectedError(() => core.prepareEvent({
    eventKey: 'pilot.onboarding.started', subjectReference: userA, idempotencyKey: 'secret',
    organizationId: tenant.organizationId, workspaceId: tenant.workspaceId,
    properties: { safeFailureCode: 'Bearer synthetic-token-123456789' },
  }, { ...tenant, subjectReference: userA, collectionState: 'pilot_standard' }, { now, pseudonymSecret: secret }), 'ANALYTICS_SECRET_VALUE_FORBIDDEN');
  pass('secret redaction');

  const onboarding = core.evaluateFunnel(events, FUNNEL_DEFINITIONS.onboarding);
  assert.equal(onboarding.denominator, 1);
  assert.equal(onboarding.steps[0].completed, 1);
  assert.equal(onboarding.steps.at(-1).completed, 1);
  pass('onboarding analytics');
  const activation = core.evaluateFunnel(events, FUNNEL_DEFINITIONS.activation);
  assert.equal(activation.steps.at(-1).medianDurationCategory, 'under_15_minutes');
  pass('activation analytics');
  const orchestration = core.evaluateFunnel(events, FUNNEL_DEFINITIONS.orchestration);
  assert.equal(orchestration.steps[0].completed, 1);
  assert.ok(orchestration.steps.some((step) => step.eventKey === 'pilot.delegation.completed' && step.completed === 1));
  pass('orchestration adoption');
  const capability = core.evaluateFunnel(events, FUNNEL_DEFINITIONS.capability);
  assert.equal(capability.steps.at(-1).completed, 1);
  pass('capability adoption');

  const impact = core.providerOutageImpact({ events, providerState: 'unavailable', capabilityGateStatus: 'blocked_provider_unavailable' });
  assert.equal(impact.groundedResearchDenialCount, 1);
  assert.equal(impact.voluntaryAbandonmentCount, 0);
  pass('provider-blocked classification');
  pass('provider denial not abandonment');

  event('pilot.enrollment.approved', userB, '2026-07-15T11:00:00.000Z', {}, {}, secondWorkspace);
  event('pilot.orchestration.run_completed', userB, '2026-07-16T11:00:00.000Z', {}, {}, secondWorkspace);
  event('pilot.orchestration.run_completed', userB, '2026-07-22T11:00:00.000Z', {}, {}, secondWorkspace);
  const entryEvents = events.filter((item) => item.eventKey === 'pilot.enrollment.approved');
  const activityEvents = events.filter((item) => item.eventKey === 'pilot.orchestration.run_completed');
  const retention = core.evaluateRetention({ entryEvents, activityEvents, minimumCohortSize: 2 });
  assert.equal(retention.state, 'available');
  assert.equal(retention.periods.day1.denominator, 2);
  pass('cohort analytics');
  pass('retention analytics');
  assert.equal(core.evaluateRetention({ entryEvents: entryEvents.slice(0, 1), activityEvents, minimumCohortSize: 5 }).state, 'suppressed_small_cohort');
  pass('small cohort suppression');

  const incomplete = core.instrumentationCoverage({ requiredEventDefinitionKeys: [...trackingPlan.requiredEventDefinitionKeys, 'pilot.feedback.resolved'], events, now });
  assert.equal(incomplete.status, 'incomplete');
  pass('missing instrumentation detected');
  event('pilot.feedback.resolved', userA, '2026-07-18T10:00:00.000Z', { feedbackCategory: 'missing_documentation' });
  const complete = core.instrumentationCoverage({ requiredEventDefinitionKeys: [...trackingPlan.requiredEventDefinitionKeys, 'pilot.feedback.resolved'], events, now });
  assert.equal(complete.status, 'complete');
  pass('instrumentation coverage');
  const quality = core.evaluateDataQuality({ duplicateCount: 1, sequenceGapCount: 1, instrumentationStatus: complete.status, now });
  assert.equal(quality.status, 'warning');
  assert.deepEqual(quality.safeWarnings, ['DUPLICATES_OBSERVED', 'SOURCE_SEQUENCE_GAPS']);
  pass('analytics data quality');

  const firstProjection = core.projectEvents(events, { batchSize: 10, interruptAfterBatch: true });
  assert.equal(firstProjection.status, 'interrupted');
  pass('projection rebuild');
  let projection = firstProjection;
  while (projection.checkpoint < Math.max(...events.map((item) => item.sequence))) {
    projection = core.projectEvents(events, { batchSize: 10, checkpoint: projection.checkpoint, existing: projection.projections });
  }
  assert.ok(projection.projections.length);
  pass('projection checkpoint resume');
  const replay = core.projectEvents(events, { checkpoint: 0, batchSize: 500, existing: projection.projections });
  assert.deepEqual(replay.projections, projection.projections);
  pass('projection idempotency');

  assert.equal(core.feedbackTaxonomy({ safeText: 'The documentation guide is missing' }).category, 'missing_documentation');
  pass('feedback taxonomy');
  const themes = core.aggregateFeedbackThemes([
    { category: 'missing_documentation', organizationId: 'synthetic-org-a', severity: 'medium', rawText: 'never copy this' },
    { category: 'provider_availability', organizationId: 'synthetic-org-a', severity: 'high', rawText: 'never copy this either' },
  ], { pilotProgramId: tenant.pilotProgramId });
  assert.equal(JSON.stringify(themes).includes('never copy'), false);
  pass('feedback themes');
  const opportunity = { opportunityType: 'documentation_improvement', evidenceReferences: ['theme:missing_documentation'], impactCategory: 'medium', effortCategory: 'low', confidenceCategory: 'medium', riskCategory: 'low' };
  assert.ok(core.opportunityScore(opportunity).score > 0);
  pass('product opportunity');
  const hypothesis = { hypothesisKey: 'improve_onboarding_docs', expectedMetricKeys: ['onboarding_completion_rate'], guardrailMetricKeys: ['credential_exposure_finding_count'], expectedDirection: 'increase' };
  assert.equal(core.validateHypothesis(hypothesis).valid, true);
  pass('product hypothesis');

  const experiment = {
    experimentId: 'experiment-14b',
    name: 'onboarding-doc-order',
    version: '1',
    environmentCategory: 'simulation',
    experimentType: 'documentation_variant',
    variants: [{ key: 'control' }, { key: 'guided' }],
    allocationBasisPoints: [5_000, 5_000],
    assignmentUnit: 'workspace',
    featureFlagKeys: ['pilot.onboarding.docs_variant'],
    stopConditions: ['credential_exposure'],
  };
  assert.equal(core.validateExperiment(experiment).valid, true);
  assert.equal(core.validateExperiment({ ...experiment, allocationBasisPoints: [4_000, 5_000] }).valid, false);
  expectedError(() => core.validateProperties(core.getEventDefinition('pilot.onboarding.started'), JSON.parse('{"__proto__":{"polluted":true}}')), 'ANALYTICS_PROPERTY_NOT_REGISTERED');
  pass('experiment validation');
  const assignmentA = core.assignExperiment({ experiment, organizationId: tenant.organizationId, unitReference: tenant.workspaceId }, secret);
  const assignmentB = core.assignExperiment({ experiment, organizationId: tenant.organizationId, unitReference: tenant.workspaceId }, secret);
  assert.deepEqual(assignmentA, assignmentB);
  assert.equal(assignmentA.exposed, false);
  pass('deterministic assignment');
  const exposure = core.recordExposure([], {
    experimentId: experiment.experimentId, experimentVersion: experiment.version,
    assignmentKey: assignmentA.assignmentKey, variantKey: assignmentA.variantKey,
    exposureKey: 'onboarding-page', eligible: true, renderedOrApplied: true,
    featureAvailable: true, gatePermitted: true, excluded: false, collectionAllowed: true,
    occurredAt: now,
  });
  assert.equal(exposure.recorded, true);
  assert.equal(core.recordExposure(exposure.exposures, {
    experimentId: experiment.experimentId, experimentVersion: experiment.version,
    assignmentKey: assignmentA.assignmentKey, variantKey: assignmentA.variantKey,
    exposureKey: 'onboarding-page', eligible: true, renderedOrApplied: true,
    featureAvailable: true, gatePermitted: true, excluded: false, collectionAllowed: true,
    occurredAt: now,
  }).duplicate, true);
  pass('exposure tracking');
  const guardrail = core.evaluateExperiment({ guardrails: { credential_exposure: 1 }, exposedCount: 10, minimumSampleSize: 5, environmentCategory: 'simulation' });
  assert.equal(guardrail.result, 'stopped_guardrail');
  assert.equal(guardrail.guardrails.securityControlsPreserved, true);
  pass('experiment guardrail');
  pass('provider outage impact');

  const recommendations = core.adoptionRecommendations({ providerImpact: impact, instrumentationStatus: complete.status });
  assert.ok(recommendations.some((item) => item.recommendationKey === 'provider_gate_must_pass'));
  assert.ok(recommendations.every((item) => item.advisory));
  pass('adoption recommendations');
  const readiness = core.expansionReadiness({
    onboardingStatus: 'healthy', reliabilityStatus: 'healthy', capacityHeadroomStatus: 'healthy',
    dataQualityStatus: 'healthy', coreCapabilityGateStatus: 'passed',
    groundedResearchGateStatus: 'blocked_provider_unavailable',
  });
  assert.equal(readiness.coreOrchestration, 'ready');
  assert.equal(readiness.groundedResearch, 'blocked');
  pass('core expansion readiness');
  pass('grounded research remains blocked');

  const snapshot = core.analyticsSnapshot({
    pilotProgramId: tenant.pilotProgramId,
    trackingPlanId: 'tracking-plan-14b',
    trackingPlanVersion: '1',
    onboardingSummary: onboarding,
    providerImpactSummary: impact,
    expansionReadinessSummary: readiness,
    generatedAt: now.toISOString(),
  });
  assert.ok(snapshot.evidenceDigest.startsWith('sha256:'));
  pass('analytics snapshot');
  const evidence = core.productLearningEvidence({
    pilotProgramId: tenant.pilotProgramId,
    analyticsSnapshotDigest: snapshot.evidenceDigest,
    feedbackThemeSummary: themes,
    recommendationSummary: recommendations,
    providerOutageSummary: impact,
    generatedAt: now.toISOString(),
  });
  assert.ok(evidence.evidenceDigest.startsWith('sha256:'));
  pass('product learning evidence');
  const exported = core.safeAnalyticsExport({
    metricDefinitions: CORE_METRIC_DEFINITIONS,
    funnelDefinitions: Object.values(FUNNEL_DEFINITIONS),
    trackingPlanMetadata: trackingPlan,
    aggregatedUsage: { successfulRuns: 2 },
    feedbackThemes: themes,
    adoptionRecommendations: recommendations,
    expansionReadiness: readiness,
    rawPrompt: 'must not export',
    authorization: 'Bearer synthetic-token-123456789',
    generatedAt: now.toISOString(),
  });
  assert.equal(containsForbidden(exported), false);
  pass('safe analytics export');

  metrics.reset();
  metrics.increment('analytics_events_accepted', { event_domain: 'orchestration', organizationId: tenant.organizationId, requestId: 'request-sensitive' });
  assert.deepEqual(metrics.snapshot()[0].labels, { event_domain: 'orchestration' });
  pass('bounded metrics');
  const artifacts = { events, onboarding, activation, orchestration, capability, retention, themes, opportunity, hypothesis, experiment, snapshot, evidence, exported };
  assert.equal(containsForbidden(artifacts), false);
  pass('no credentials leaked');
  assert.notEqual(core.tenantPseudonym({ organizationId: 'synthetic-org-a', workspaceId: 'w', subjectReference: 'u' }, secret), core.tenantPseudonym({ organizationId: 'synthetic-org-b', workspaceId: 'w', subjectReference: 'u' }, secret));
  pass('tenant isolation');
  pass('pilot-analytics-adoption verification');
  return { eventDefinitions: ANALYTICS_EVENT_DEFINITIONS.length, events: events.length, projections: projection.projections.length };
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL pilot-analytics-adoption verification: ${error.code || error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
