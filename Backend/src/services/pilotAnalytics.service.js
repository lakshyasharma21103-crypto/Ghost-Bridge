const crypto = require('node:crypto');
const models = require('../models/pilotAnalyticsModels');
const pilotModels = require('../models/stagingPilotModels');
const LegalHold = require('../models/LegalHold');
const core = require('./pilotAnalyticsCore.service');
const metrics = require('./pilotAnalyticsMetrics.service');
const { ANALYTICS_EVENT_DEFINITIONS, CORE_METRIC_DEFINITIONS, FUNNEL_DEFINITIONS } = require('../constants/pilotAnalytics');
const { createAuditLog } = require('./auditService');
const { consumeApprovalGrants, enforceApproval } = require('./approval.service');
const { AppError } = require('../utils/AppError');

function dependencies(overrides = {}) {
  return {
    ...models,
    ...pilotModels,
    LegalHold,
    createAuditLog,
    consumeApprovalGrants,
    enforceApproval,
    metrics,
    ...overrides,
  };
}

function id(value) {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || value.planId || value.metricKey || value.funnelKey || value.cohortKey || value.opportunityId || value.hypothesisId || value.experimentId || value.snapshotId || value.evidenceId || value.backfillId || '').trim();
  }
  return String(value || '').trim();
}

function plain(value) {
  if (!value) return value;
  const output = typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value };
  output.id = id(value);
  delete output._id;
  delete output.__v;
  delete output.subjectReference;
  delete output.idempotencyKey;
  delete output.properties;
  return core.sanitizeExport(output);
}

function scope(input = {}, caller = {}) {
  const organizationId = id(caller.partner?.organizationId || caller.partner?._id);
  if (!organizationId) throw new AppError(400, 'ANALYTICS_SCOPE_REQUIRED', 'Authenticated organization scope is required.');
  if (input.organizationId && id(input.organizationId) !== organizationId && caller.platformAuthorized !== true) {
    throw new AppError(403, 'ANALYTICS_CROSS_TENANT_SCOPE', 'Analytics scope is not available.');
  }
  const trustedWorkspace = id(caller.authorization?.workspaceId || caller.partner?.workspaceId);
  const requestedWorkspace = id(input.workspaceId || input.receivingWorkspaceId);
  if (trustedWorkspace && requestedWorkspace && trustedWorkspace !== requestedWorkspace && caller.platformAuthorized !== true) {
    throw new AppError(403, 'ANALYTICS_CROSS_WORKSPACE_SCOPE', 'Analytics workspace scope is not available.');
  }
  return {
    organizationId,
    workspaceId: requestedWorkspace || trustedWorkspace || undefined,
    actorId: id(caller.authorization?.actorId || caller.partner?._id || 'system'),
    actorType: caller.partner ? 'partner' : 'system',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function scopedQuery(value, input = {}, includeWorkspace = true) {
  return {
    organizationId: value.organizationId,
    ...(includeWorkspace && value.workspaceId ? { workspaceId: value.workspaceId } : {}),
    ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}),
  };
}

function deterministicId(prefix, input, value) {
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  const hash = crypto.createHash('sha256').update(`${prefix}:${value.organizationId}:${value.workspaceId || ''}:${input.idempotencyKey}`).digest('hex');
  return `${prefix}-${hash.slice(0, 24)}`;
}

async function audit(action, type, record, value, metadata, d) {
  await d.createAuditLog(value.actorType, value.actorId, action, type, id(record), {
    organizationId: value.organizationId,
    workspaceId: value.workspaceId,
    ...core.sanitizeExport(metadata || {}),
  }, { requestId: value.requestId, traceId: value.traceId });
}

async function page(Model, query, input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 50), 100));
  const items = await Model.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return { items: items.map(plain), limit, nextCursor: items.length === limit ? id(items.at(-1)) : null };
}

async function one(Model, query, code = 'ANALYTICS_RECORD_NOT_FOUND') {
  const record = await Model.findOne(query);
  if (!record) throw new AppError(404, code, 'The requested analytics record was not found.');
  return record;
}

function translate(error) {
  if (error instanceof AppError) return error;
  if (error?.code && String(error.code).startsWith('ANALYTICS_')) {
    return new AppError(error.status || 400, error.code, error.message, error.details || []);
  }
  return error;
}

async function approval(input, value, permission, type, record, d) {
  if (!input.approvalRequestId) throw new AppError(409, 'ANALYTICS_APPROVAL_REQUIRED', 'A governed approval reference is required.');
  const enforcement = await d.enforceApproval({
    organizationId: value.organizationId,
    workspaceId: value.workspaceId,
    requesterActorId: value.actorId,
    requesterActorType: value.actorType,
    permission,
    resourceType: type,
    resourceId: id(record) || id(record?.pilotProgramId) || id(record?.analyticsSnapshotId) || 'pilot-analytics-operation',
    operationType: permission.replaceAll('.', '_').toUpperCase(),
    safeRequestAttributes: {
      requestedAction: permission,
      pilotProgramId: record.pilotProgramId,
      analyticsClassification: record.classification,
      experimentType: record.experimentType,
      assignmentUnit: record.assignmentUnit,
    },
    approvalRequestId: input.approvalRequestId,
  });
  return d.consumeApprovalGrants(enforcement, {
    actorId: value.actorId,
    actorType: value.actorType,
    requestId: value.requestId,
    traceId: value.traceId,
  });
}

async function createTrackingPlan(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies);
  const s = scope(input, caller);
  const planId = input.planId || deterministicId('atp', input, s);
  const payload = {
    planId, scope: input.scope || 'pilot_program', pilotProgramId: input.pilotProgramId,
    ...scopedQuery(s, {}, true), name: input.name, description: input.description,
    version: input.version || '1', status: 'draft',
    eventDefinitionKeys: input.eventDefinitionKeys || [],
    requiredEventDefinitionKeys: input.requiredEventDefinitionKeys || [],
    optionalEventDefinitionKeys: input.optionalEventDefinitionKeys || [],
    collectionMode: input.collectionMode || 'standard',
    retentionPolicyReference: input.retentionPolicyReference,
    consentPolicyReference: input.consentPolicyReference,
    redactionPolicyReference: input.redactionPolicyReference,
    allowedClassifications: input.allowedClassifications || ['operational_metadata', 'product_usage', 'onboarding_progress', 'capability_usage', 'performance_summary', 'reliability_summary', 'support_summary', 'feedback_summary', 'experiment_exposure', 'experiment_outcome'],
    prohibitedFields: input.prohibitedFields || [],
    maximumEventBytes: input.maximumEventBytes || 8_192,
    maximumProperties: input.maximumProperties || 24,
    maximumStringLength: input.maximumStringLength || 256,
    maximumArrayLength: input.maximumArrayLength || 16,
    samplingPolicy: input.samplingPolicy || { category: 'unsampled_pilot' },
    createdBy: s.actorId,
  };
  try {
    const record = await d.AnalyticsTrackingPlan.create(payload);
    await audit('pilot_analytics.tracking_plan.created', 'AnalyticsTrackingPlan', record, s, { planId, status: record.status }, d);
    return plain(record);
  } catch (error) {
    if (error?.code === 11000) return plain(await d.AnalyticsTrackingPlan.findOne({ planId }));
    throw translate(error);
  }
}

async function listTrackingPlans(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.AnalyticsTrackingPlan, scopedQuery(s, input), input);
}

async function getTrackingPlan(planId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.AnalyticsTrackingPlan, { planId, ...scopedQuery(s, input) }));
}

async function trackingPlanAction(planId, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.AnalyticsTrackingPlan, { planId, ...scopedQuery(s, input) });
  if (record.status === 'active' && !['archive'].includes(action)) throw new AppError(409, 'ANALYTICS_ACTIVE_VERSION_IMMUTABLE', 'Active tracking plans are immutable.');
  if (action === 'update') {
    Object.assign(record, Object.fromEntries(['name', 'description', 'eventDefinitionKeys', 'requiredEventDefinitionKeys', 'optionalEventDefinitionKeys', 'collectionMode', 'allowedClassifications', 'samplingPolicy'].filter((key) => input[key] !== undefined).map((key) => [key, input[key]])));
    record.updatedBy = s.actorId;
  } else if (action === 'validate') {
    record.status = 'validating';
    const result = core.validateTrackingPlan(record.toObject());
    if (!result.valid) throw new AppError(422, result.safeFailureCodes[0], 'Tracking plan validation failed.', result.safeFailureCodes);
    record.status = 'draft';
  } else if (action === 'activate') {
    const result = core.validateTrackingPlan(record.toObject());
    if (!result.valid) throw new AppError(422, result.safeFailureCodes[0], 'Tracking plan validation failed.', result.safeFailureCodes);
    await approval(input, s, 'analyticsTrackingPlan.activate', 'AnalyticsTrackingPlan', record, d);
    record.status = 'active'; record.activatedBy = s.actorId;
  } else if (action === 'archive') {
    record.status = 'archived'; record.archivedBy = s.actorId;
  }
  await record.save();
  await audit(`pilot_analytics.tracking_plan.${action === 'update' ? 'updated' : action + 'd'}`, 'AnalyticsTrackingPlan', record, s, { status: record.status }, d);
  return plain(record);
}

function listEventDefinitions(input = {}) {
  const items = ANALYTICS_EVENT_DEFINITIONS
    .filter((item) => !input.domain || item.domain === input.domain)
    .map((item) => ({ ...item }));
  return { items, count: items.length, registryVersion: '14B.1', dynamicRegistrationAllowed: false };
}

function getEventDefinition(eventKey) {
  return { ...core.getEventDefinition(eventKey), registryVersion: '14B.1' };
}

async function assertPilotScope(input, s, d) {
  const program = await d.PilotProgram.findOne({ programId: input.pilotProgramId, organizationId: s.organizationId }).lean();
  if (!program || !['approved', 'onboarding', 'active', 'paused', 'completed'].includes(program.status)) {
    throw new AppError(403, 'ANALYTICS_PILOT_NOT_ACTIVE', 'Analytics requires an approved pilot program.');
  }
  const tenant = await d.PilotTenantEnrollment.findOne({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId, status: { $in: ['approved', 'active', 'paused', 'graduated'] } }).lean();
  if (!tenant) throw new AppError(403, 'ANALYTICS_PILOT_TENANT_NOT_ENROLLED', 'The organization is not enrolled in this pilot.');
  if (s.workspaceId) {
    const workspace = await d.PilotWorkspaceEnrollment.findOne({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId, workspaceId: s.workspaceId, status: { $in: ['approved', 'onboarding', 'active', 'paused', 'graduated'] } }).lean();
    if (!workspace) throw new AppError(403, 'ANALYTICS_PILOT_WORKSPACE_NOT_ENROLLED', 'The workspace is not enrolled in this pilot.');
  }
  return { program, tenant };
}

async function ingestEvent(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  try {
    const enrollment = await assertPilotScope(input, s, d);
    const plan = await d.AnalyticsTrackingPlan.findOne({
      pilotProgramId: input.pilotProgramId, organizationId: s.organizationId,
      $or: [{ workspaceId: s.workspaceId }, { workspaceId: { $exists: false } }],
      status: 'active',
    }).sort({ workspaceId: -1, version: -1 }).lean();
    if (!plan) throw new AppError(403, 'ANALYTICS_TRACKING_PLAN_INACTIVE', 'No active tracking plan permits this event.');
    if (!plan.eventDefinitionKeys.includes(input.eventKey)) throw new AppError(403, 'ANALYTICS_EVENT_NOT_IN_TRACKING_PLAN', 'The active tracking plan does not include this event.');
    const collectionState = input.collectionState || (plan.collectionMode === 'minimal' ? 'minimal_operational' : plan.collectionMode === 'enhanced' ? 'enhanced_opt_in' : plan.collectionMode === 'disabled' ? 'disabled' : 'pilot_standard');
    const prepared = core.prepareEvent(input, {
      pilotProgramId: input.pilotProgramId,
      organizationId: s.organizationId,
      workspaceId: s.workspaceId,
      subjectReference: input.subjectReference || s.actorId,
      collectionState,
      allowedClassifications: plan.allowedClassifications,
      releaseCandidateId: enrollment.program.releaseCandidateId,
      releaseVersion: enrollment.program.releaseVersion,
      featureFlagSnapshotVersion: enrollment.program.featureFlagSnapshotVersion,
      capabilityKey: input.capabilityKey,
      capabilityGateStatus: input.capabilityGateStatus,
      outcomeCategory: input.outcomeCategory,
      safeFailureCode: input.safeFailureCode,
      sourceCategory: input.sourceCategory || 'backend',
      requestId: s.requestId,
      traceId: s.traceId,
    }, {
      now: options.now,
      pseudonymSecret: options.pseudonymSecret || process.env.DATA_ACCESS_CURSOR_SECRET || 'local-pilot-analytics-key-v1',
      rawEventRetentionMs: options.rawEventRetentionMs,
    });
    const existing = await d.PilotAnalyticsEvent.findOne({
      organizationId: s.organizationId,
      workspaceId: s.workspaceId,
      deduplicationKey: prepared.deduplicationKey,
    });
    if (existing) {
      d.metrics.increment('analytics_duplicates', { event_domain: core.getEventDefinition(input.eventKey).domain });
      await audit('pilot_analytics.event.duplicate', 'PilotAnalyticsEvent', existing, s, { eventKey: input.eventKey }, d);
      return { duplicate: true, event: plain(existing) };
    }
    const record = await d.PilotAnalyticsEvent.create(prepared);
    d.metrics.increment('analytics_events_accepted', { event_domain: core.getEventDefinition(input.eventKey).domain });
    await audit('pilot_analytics.event.accepted', 'PilotAnalyticsEvent', record, s, { eventKey: input.eventKey, classification: prepared.classification }, d);
    return { duplicate: false, event: plain(record), projectionStatus: 'pending' };
  } catch (error) {
    const translated = translate(error);
    d.metrics.increment('analytics_events_rejected', { safe_reason: translated.code || 'ANALYTICS_REJECTED' });
    throw translated;
  }
}

async function eventsFor(input, s, d) {
  const limit = Math.max(1, Math.min(Number(input.maximumEvents || 10_000), 10_000));
  return d.PilotAnalyticsEvent.find({
    ...scopedQuery(s, input),
    ...(input.windowStart || input.windowEnd ? { occurredAt: { ...(input.windowStart ? { $gte: new Date(input.windowStart) } : {}), ...(input.windowEnd ? { $lt: new Date(input.windowEnd) } : {}) } } : {}),
  }).sort({ occurredAt: 1, _id: 1 }).limit(limit).lean();
}

async function getDataQuality(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  const sequences = events.map((event) => Number(event.sequence)).filter(Number.isFinite).sort((a, b) => a - b);
  const gaps = sequences.slice(1).filter((value, index) => value > sequences[index] + 1).length;
  const result = core.evaluateDataQuality({
    schemaFailureCount: Number(input.schemaFailureCount || 0),
    duplicateCount: Number(input.duplicateCount || 0),
    sequenceGapCount: gaps,
    instrumentationStatus: input.instrumentationStatus,
    backfillStatus: input.backfillStatus,
    now: options.now || Date.now(),
  });
  d.metrics.increment('analytics_data_quality', { quality_category: result.status });
  return { ...result, eventCount: events.length, sourceSequenceGapCount: gaps };
}

async function getInstrumentationCoverage(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const plan = await d.AnalyticsTrackingPlan.findOne({ ...scopedQuery(s, input), status: 'active' }).sort({ version: -1 }).lean();
  if (!plan) return { status: 'unknown', requiredEventCount: 0, observedEventCount: 0 };
  const events = await eventsFor(input, s, d);
  const result = core.instrumentationCoverage({
    requiredEventDefinitionKeys: plan.requiredEventDefinitionKeys,
    events,
    schemaFailureCount: input.schemaFailureCount,
    deduplicationCount: input.deduplicationCount,
    now: options.now || Date.now(),
  });
  d.metrics.increment('analytics_instrumentation_coverage', { coverage_category: result.status });
  return { trackingPlanId: plan.planId, trackingPlanVersion: plan.version, ...result };
}

async function createMetricDefinition(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const validation = core.validateMetricDefinition(input);
  if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'Metric definition is invalid.', validation.safeFailureCodes);
  const record = await d.PilotMetricDefinition.create({ ...input, status: 'draft', createdBy: s.actorId });
  await audit('pilot_analytics.metric.created', 'PilotMetricDefinition', record, s, { metricKey: record.metricKey }, d);
  return plain(record);
}

async function listMetricDefinitions(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); scope(input, caller);
  const stored = await d.PilotMetricDefinition.find(input.status ? { status: input.status } : {}).sort({ metricKey: 1, version: -1 }).limit(500).lean();
  return { items: stored.length ? stored.map(plain) : CORE_METRIC_DEFINITIONS.map((item) => ({ ...item })), codeDefinedFallback: !stored.length };
}

async function getMetricDefinition(metricKey, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); scope(input, caller);
  const record = await d.PilotMetricDefinition.findOne({ metricKey }).sort({ version: -1 }).lean();
  const fallback = CORE_METRIC_DEFINITIONS.find((item) => item.metricKey === metricKey);
  if (!record && !fallback) throw new AppError(404, 'PILOT_METRIC_NOT_FOUND', 'The metric definition was not found.');
  return plain(record || fallback);
}

async function metricAction(metricKey, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotMetricDefinition, { metricKey, version: input.version || '1' });
  if (action === 'update') Object.assign(record, Object.fromEntries(['displayName', 'description', 'numeratorEventKeys', 'denominatorEventKeys', 'minimumSampleSize', 'missingDataBehavior', 'ownerReference'].filter((key) => input[key] !== undefined).map((key) => [key, input[key]])));
  if (action === 'validate' || action === 'activate') {
    const validation = core.validateMetricDefinition(record.toObject());
    if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'Metric definition is invalid.');
    if (action === 'activate') {
      await approval(input, s, 'pilotMetricDefinition.activate', 'PilotMetricDefinition', record, d);
      record.status = 'active'; record.activatedBy = s.actorId;
    }
  }
  if (action === 'archive') { record.status = 'archived'; record.archivedBy = s.actorId; }
  await record.save();
  if (action === 'activate') await audit('pilot_analytics.metric.activated', 'PilotMetricDefinition', record, s, { metricKey }, d);
  return plain(record);
}

async function createFunnel(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  for (const step of input.orderedSteps || []) core.getEventDefinition(step.eventKey || step);
  const record = await d.PilotFunnelDefinition.create({ ...input, pilotProgramId: input.pilotProgramId, createdBy: s.actorId, status: 'draft' });
  return plain(record);
}

async function listFunnels(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); scope(input, caller);
  const records = await d.PilotFunnelDefinition.find(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}).sort({ funnelKey: 1, version: -1 }).lean();
  return { items: records.length ? records.map(plain) : Object.values(FUNNEL_DEFINITIONS).map((item) => ({ ...item, status: 'active' })), codeDefinedFallback: !records.length };
}

async function getFunnel(funnelKey, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); scope(input, caller);
  const record = await d.PilotFunnelDefinition.findOne({ funnelKey }).sort({ version: -1 }).lean();
  const fallback = Object.values(FUNNEL_DEFINITIONS).find((item) => item.funnelKey === funnelKey);
  if (!record && !fallback) throw new AppError(404, 'PILOT_FUNNEL_NOT_FOUND', 'The funnel was not found.');
  return plain(record || fallback);
}

async function evaluateFunnel(funnelKey, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const registered = Object.values(FUNNEL_DEFINITIONS).find((item) => item.funnelKey === funnelKey) ||
    await d.PilotFunnelDefinition.findOne({ funnelKey, ...scopedQuery(s, input, false), status: 'active' }).lean();
  if (!registered) throw new AppError(404, 'PILOT_FUNNEL_NOT_FOUND', 'The funnel was not found.');
  const definition = registered.orderedSteps?.[0]?.eventKey ? { ...registered, orderedSteps: registered.orderedSteps.map((step) => step.eventKey) } : registered;
  const result = core.evaluateFunnel(await eventsFor(input, s, d), definition, input);
  d.metrics.increment('analytics_funnel_evaluation', { outcome: result.denominator ? 'available' : 'insufficient_data' });
  await audit('pilot_analytics.funnel.evaluated', 'PilotFunnelDefinition', registered, s, { funnelKey, denominatorCategory: result.denominator ? 'non_zero' : 'zero' }, d);
  return result;
}

async function createCohort(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  core.getEventDefinition(input.entryEventKey);
  const record = await d.PilotCohortDefinition.create({ ...input, organizationId: s.organizationId, createdBy: s.actorId, status: 'draft' });
  return plain(record);
}

async function listCohorts(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotCohortDefinition, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function getCohort(cohortKey, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotCohortDefinition, { cohortKey, organizationId: s.organizationId }));
}

async function evaluateCohort(cohortKey, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const cohort = await one(d.PilotCohortDefinition, { cohortKey, organizationId: s.organizationId });
  const events = await eventsFor({ ...input, pilotProgramId: cohort.pilotProgramId }, s, d);
  const result = core.evaluateRetention({
    entryEvents: events.filter((event) => event.eventKey === cohort.entryEventKey),
    activityEvents: events.filter((event) => event.eventKey === (input.activityEventKey || 'pilot.orchestration.run_completed')),
    periods: cohort.observationWindows?.length ? cohort.observationWindows : [1, 7, 14, 30],
    minimumCohortSize: cohort.minimumCohortSize,
  });
  d.metrics.increment('analytics_cohort_evaluation', { outcome: result.state });
  await audit('pilot_analytics.cohort.evaluated', 'PilotCohortDefinition', cohort, s, { cohortKey, state: result.state }, d);
  return { cohortKey, ...result };
}

async function getRetention(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  return core.evaluateRetention({
    entryEvents: events.filter((event) => event.eventKey === (input.entryEventKey || 'pilot.enrollment.approved')),
    activityEvents: events.filter((event) => event.eventKey === (input.activityEventKey || 'pilot.orchestration.run_completed')),
    minimumCohortSize: Number(input.minimumCohortSize || 5),
  });
}

async function adoption(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  const subjects = new Set(events.map((event) => event.anonymousSubjectKey).filter(Boolean));
  const completed = events.filter((event) => event.eventKey === 'pilot.orchestration.run_completed');
  const submissions = events.filter((event) => event.eventKey === 'pilot.orchestration.run_submitted');
  return {
    reportingWindow: { start: input.windowStart || null, end: input.windowEnd || null },
    denominator: subjects.size,
    activeSubjects: subjects.size,
    orchestrationSubmissions: submissions.length,
    successfulRuns: completed.length,
    successfulRunRate: core.boundedPercentage(completed.length, submissions.length, 1),
    providerBlockedUsage: events.filter((event) => core.classifyFriction({ providerUnavailable: event.eventKey === 'pilot.grounded_research.denied_provider' }) === 'provider_unavailable').length,
    authorizationAuthority: false,
  };
}

async function capabilityAdoption(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  const keys = [...new Set(events.map((event) => event.capabilityKey).filter(Boolean))];
  if (!keys.includes('external.grounded_research')) keys.push('external.grounded_research');
  return { items: keys.sort().map((capabilityKey) => {
    const scoped = events.filter((event) => event.capabilityKey === capabilityKey);
    const providerBlocked = scoped.filter((event) => event.eventKey === 'pilot.grounded_research.denied_provider').length;
    const gateBlocked = scoped.filter((event) => event.eventKey === 'pilot.grounded_research.denied_gate' || event.eventKey === 'pilot.capability_gate.blocked').length;
    const firstUse = scoped.filter((event) => event.eventKey === 'pilot.capability.first_used').length;
    const repeatUse = scoped.filter((event) => event.eventKey === 'pilot.capability.repeated_use').length;
    const grounded = capabilityKey === 'external.grounded_research';
    return {
      capabilityKey, eligible: scoped.length, discovered: scoped.filter((event) => event.eventKey.includes('viewed')).length,
      firstUse, successfulFirstUse: firstUse, repeatUse, gateBlocked, providerBlocked,
      quotaBlocked: scoped.filter((event) => event.eventKey === 'pilot.quota.rejected').length,
      reliabilityAdjustedAdoption: grounded ? { state: 'blocked_provider', value: null } : core.boundedPercentage(firstUse, Math.max(scoped.length, firstUse), 1),
      recommendation: grounded ? 'provider_gate_must_pass' : repeatUse ? 'expand_capability_to_next_cohort' : 'collect_more_evidence',
      gateState: grounded ? 'blocked_provider_unavailable' : 'unknown',
    };
  }) };
}

async function friction(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  const categories = {};
  for (const event of events) {
    const category = core.classifyFriction({
      providerUnavailable: event.eventKey === 'pilot.grounded_research.denied_provider',
      capabilityGateBlocked: event.eventKey === 'pilot.grounded_research.denied_gate' || event.eventKey === 'pilot.capability_gate.blocked',
      quotaRejected: event.eventKey === 'pilot.quota.rejected',
      policyDenied: event.safeFailureCode === 'POLICY_DENIED',
      runtimeFailure: event.eventKey === 'pilot.orchestration.run_failed',
    });
    if (category !== 'unknown') categories[category] = (categories[category] || 0) + 1;
  }
  return { categories, blockedActivityIsNotAbandonment: true };
}

async function providerImpact(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const events = await eventsFor(input, s, d);
  return core.providerOutageImpact({ events, providerState: 'unavailable', capabilityGateStatus: 'blocked_provider_unavailable' });
}

async function recommendations(input = {}, caller = {}, options = {}) {
  const impact = await providerImpact(input, caller, options);
  const coverage = await getInstrumentationCoverage(input, caller, options);
  return { items: core.adoptionRecommendations({ providerImpact: impact, instrumentationStatus: coverage.status, onboardingDropoff: input.onboardingDropoff }) };
}

async function expansion(input = {}, caller = {}, options = {}) {
  scope(input, caller);
  return core.expansionReadiness({
    onboardingStatus: input.onboardingStatus || 'healthy',
    reliabilityStatus: input.reliabilityStatus || 'healthy',
    capacityHeadroomStatus: input.capacityHeadroomStatus || 'healthy',
    dataQualityStatus: input.dataQualityStatus || 'healthy',
    coreCapabilityGateStatus: input.coreCapabilityGateStatus || 'passed',
    groundedResearchGateStatus: 'blocked_provider_unavailable',
    securityFindings: input.securityFindings,
    severeIncidents: input.severeIncidents,
  });
}

async function createFeedbackTheme(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const feedback = input.feedbackRecords || await d.PilotFeedback.find(scopedQuery(s, input)).lean();
  const themes = core.aggregateFeedbackThemes(feedback.map((record) => ({
    category: input.categoryMapping?.[record.category] || (record.category === 'onboarding' ? 'onboarding_confusion' : record.category === 'documentation' ? 'missing_documentation' : FEEDBACK_TAXONOMY_COMPAT(record.category)),
    organizationId: record.organizationId, affectedCapabilityKey: record.affectedCapabilityKey, severity: record.severity,
  })), { pilotProgramId: input.pilotProgramId });
  const created = [];
  for (const theme of themes) {
    const record = await d.PilotFeedbackTheme.findOneAndUpdate(
      { pilotProgramId: theme.pilotProgramId, themeKey: theme.themeKey, version: theme.version },
      { $set: { ...theme, organizationId: s.organizationId } },
      { upsert: true, new: true, runValidators: true },
    );
    created.push(plain(record));
  }
  await audit('pilot_analytics.feedback.theme_created', 'PilotFeedbackTheme', created[0] || input.pilotProgramId, s, { themeCountCategory: themes.length ? 'non_zero' : 'zero' }, d);
  return { items: created };
}

function FEEDBACK_TAXONOMY_COMPAT(value) {
  const map = { usability: 'navigation_difficulty', orchestration: 'orchestration_builder', agent_selection: 'agent_selection', delegation: 'delegation', recovery: 'recovery', performance: 'performance', reliability: 'reliability', observability: 'observability', support: 'support_experience', feature_request: 'feature_request' };
  return map[value] || 'other';
}

async function listFeedbackThemes(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotFeedbackTheme, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function feedbackTrends(input = {}, caller = {}, options = {}) {
  const themes = await listFeedbackThemes(input, caller, options);
  return { items: themes.items.map((theme) => ({ themeKey: theme.themeKey, trendCategory: theme.trendCategory, feedbackCountCategory: theme.feedbackCountCategory, confidenceCategory: theme.confidenceCategory })) };
}

async function supportTrends(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const records = await d.PilotSupportCase.find(scopedQuery(s, input)).lean();
  return { totalCountCategory: records.length ? 'non_zero' : 'none', severityCategories: Object.fromEntries(['low', 'medium', 'high', 'critical'].map((severity) => [severity, records.filter((record) => record.severity === severity).length])) };
}

async function createOpportunity(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  if (!(input.evidenceReferences || []).length) throw new AppError(422, 'OPPORTUNITY_EVIDENCE_REQUIRED', 'Product opportunities require evidence references.');
  const opportunityId = input.opportunityId || deterministicId('opp', input, s);
  const record = await d.PilotProductOpportunity.create({ ...input, opportunityId, organizationId: s.organizationId, status: 'proposed', createdBy: s.actorId });
  await audit('pilot_analytics.opportunity.created', 'PilotProductOpportunity', record, s, { opportunityType: record.opportunityType }, d);
  return plain(record);
}

async function listOpportunities(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotProductOpportunity, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function getOpportunity(opportunityId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotProductOpportunity, { opportunityId, organizationId: s.organizationId }));
}

async function opportunityAction(opportunityId, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotProductOpportunity, { opportunityId, organizationId: s.organizationId });
  if (action === 'update') Object.assign(record, Object.fromEntries(['title', 'safeSummary', 'impactCategory', 'effortCategory', 'confidenceCategory', 'riskCategory', 'ownerReference', 'status'].filter((key) => input[key] !== undefined).map((key) => [key, input[key]])));
  if (action === 'approve') {
    await approval(input, s, 'pilotProductOpportunity.approve', 'PilotProductOpportunity', record, d);
    record.status = 'approved'; record.approvedBy = s.actorId;
  }
  if (action === 'archive') record.status = 'archived';
  await record.save();
  if (action === 'approve') await audit('pilot_analytics.opportunity.approved', 'PilotProductOpportunity', record, s, { status: record.status }, d);
  return plain(record);
}

async function createHypothesis(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const hypothesisId = input.hypothesisId || deterministicId('hyp', input, s);
  const validation = core.validateHypothesis(input);
  if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'The hypothesis is invalid.');
  const record = await d.PilotProductHypothesis.create({ ...input, hypothesisId, organizationId: s.organizationId, version: input.version || '1', status: 'draft', createdBy: s.actorId });
  await audit('pilot_analytics.hypothesis.created', 'PilotProductHypothesis', record, s, { hypothesisKey: record.hypothesisKey }, d);
  return plain(record);
}

async function listHypotheses(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotProductHypothesis, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function getHypothesis(hypothesisId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotProductHypothesis, { hypothesisId, organizationId: s.organizationId }));
}

async function hypothesisAction(hypothesisId, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotProductHypothesis, { hypothesisId, organizationId: s.organizationId });
  const validation = core.validateHypothesis(record.toObject());
  if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'The hypothesis is invalid.');
  if (action === 'validate') record.status = 'validated';
  if (action === 'approve') {
    await approval(input, s, 'pilotHypothesis.approve', 'PilotProductHypothesis', record, d);
    record.status = 'approved'; record.approvedBy = s.actorId;
  }
  await record.save();
  if (action === 'approve') await audit('pilot_analytics.hypothesis.approved', 'PilotProductHypothesis', record, s, { hypothesisKey: record.hypothesisKey }, d);
  return plain(record);
}

async function createExperiment(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const validation = core.validateExperiment(input);
  if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'The experiment is invalid.', validation.safeFailureCodes);
  const experimentId = input.experimentId || deterministicId('exp', input, s);
  const record = await d.PilotExperiment.create({ ...input, experimentId, organizationId: s.organizationId, version: input.version || '1', status: 'draft', createdBy: s.actorId });
  d.metrics.increment('analytics_experiment_state', { state: 'draft' });
  await audit('pilot_analytics.experiment.created', 'PilotExperiment', record, s, { experimentType: record.experimentType }, d);
  return plain(record);
}

async function listExperiments(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotExperiment, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function getExperiment(experimentId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotExperiment, { experimentId, organizationId: s.organizationId }));
}

async function experimentAction(experimentId, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotExperiment, { experimentId, organizationId: s.organizationId });
  const validation = core.validateExperiment(record.toObject());
  if (!validation.valid) throw new AppError(422, validation.safeFailureCodes[0], 'The experiment is invalid.');
  if (action === 'validate') record.status = 'approval_required';
  if (action === 'approve') { await approval(input, s, 'pilotExperiment.approve', 'PilotExperiment', record, d); record.status = 'approved'; record.approvedBy = s.actorId; }
  if (action === 'start') { await approval(input, s, 'pilotExperiment.start', 'PilotExperiment', record, d); record.status = 'running'; }
  if (action === 'pause') record.status = 'paused';
  if (action === 'resume') { await approval(input, s, 'pilotExperiment.resume', 'PilotExperiment', record, d); record.status = 'running'; }
  if (action === 'stop') record.status = 'stopped';
  if (action === 'evaluate') {
    const result = core.evaluateExperiment(input);
    if (result.result === 'stopped_guardrail') record.status = 'paused';
    else if (['positive', 'negative', 'neutral'].includes(result.result)) record.status = 'completed';
    else record.status = 'inconclusive';
    await record.save();
    d.metrics.increment('analytics_experiment_guardrail', { outcome: result.guardrails?.outcome || 'continue' });
    return { experiment: plain(record), evaluation: result };
  }
  await record.save();
  d.metrics.increment('analytics_experiment_state', { state: record.status });
  await audit(`pilot_analytics.experiment.${action === 'approve' ? 'approved' : action === 'start' ? 'started' : action === 'pause' ? 'paused' : action}`, 'PilotExperiment', record, s, { status: record.status }, d);
  return plain(record);
}

async function createSnapshot(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const artifact = core.analyticsSnapshot({ ...input, organizationId: s.organizationId, generatedAt: input.generatedAt || new Date().toISOString() });
  const snapshotId = input.snapshotId || deterministicId('snap', input, s);
  const record = await d.PilotAnalyticsSnapshot.create({
    snapshotId, pilotProgramId: input.pilotProgramId, organizationId: s.organizationId,
    releaseCandidateId: input.releaseCandidateId, trackingPlanId: input.trackingPlanId,
    trackingPlanVersion: input.trackingPlanVersion, windowStart: input.windowStart, windowEnd: input.windowEnd,
    summaries: core.sanitizeExport(input.summaries || input), safeWarnings: input.safeWarnings || [],
    safeFailureCodes: input.safeFailureCodes || [], generatedAt: artifact.generatedAt, evidenceDigest: artifact.evidenceDigest,
  });
  await audit('pilot_analytics.snapshot.generated', 'PilotAnalyticsSnapshot', record, s, { evidenceDigest: artifact.evidenceDigest }, d);
  return plain(record);
}

async function listSnapshots(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotAnalyticsSnapshot, { organizationId: s.organizationId, ...(input.pilotProgramId ? { pilotProgramId: input.pilotProgramId } : {}) }, input);
}

async function getSnapshot(snapshotId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotAnalyticsSnapshot, { snapshotId, organizationId: s.organizationId }));
}

async function createEvidence(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  await approval(input, s, 'pilotProductEvidence.create', 'PilotProductLearningEvidence', input, d);
  const artifact = core.productLearningEvidence({ ...input, organizationId: s.organizationId, generatedBy: s.actorId, generatedAt: input.generatedAt || new Date().toISOString() });
  const evidenceId = input.evidenceId || deterministicId('ple', input, s);
  const record = await d.PilotProductLearningEvidence.create({
    evidenceId, pilotProgramId: input.pilotProgramId, organizationId: s.organizationId,
    releaseCandidateId: input.releaseCandidateId, analyticsSnapshotId: input.analyticsSnapshotId,
    summaries: core.sanitizeExport(input.summaries || input), approvalSummary: { approvalRequestId: input.approvalRequestId },
    waiverSummary: input.waiverSummary || {}, evidenceDigest: artifact.evidenceDigest,
    generatedBy: s.actorId, generatedAt: artifact.generatedAt,
  });
  d.metrics.increment('analytics_evidence_status', { status: 'generated' });
  await audit('pilot_analytics.evidence.generated', 'PilotProductLearningEvidence', record, s, { evidenceDigest: artifact.evidenceDigest }, d);
  return plain(record);
}

async function getEvidence(evidenceId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotProductLearningEvidence, { evidenceId, organizationId: s.organizationId }));
}

async function exportAnalytics(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  await approval(input, s, 'pilotAnalytics.export', 'PilotAnalyticsExport', input, d);
  const [plans, metricsList, funnels, themes, experiments, opportunities] = await Promise.all([
    d.AnalyticsTrackingPlan.find(scopedQuery(s, input)).lean(),
    d.PilotMetricDefinition.find({ status: 'active' }).lean(),
    d.PilotFunnelDefinition.find({ pilotProgramId: input.pilotProgramId }).lean(),
    d.PilotFeedbackTheme.find({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId }).lean(),
    d.PilotExperiment.find({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId }).lean(),
    d.PilotProductOpportunity.find({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId }).lean(),
  ]);
  const artifact = core.safeAnalyticsExport({
    trackingPlanMetadata: plans.map(plain),
    metricDefinitions: (metricsList.length ? metricsList : CORE_METRIC_DEFINITIONS).map(plain),
    funnelDefinitions: funnels.map(plain),
    feedbackThemes: themes.map(plain),
    experimentSummaries: experiments.map(plain),
    adoptionRecommendations: core.adoptionRecommendations({ providerImpact: { capabilityGateStatus: 'blocked_provider_unavailable' } }),
    expansionReadiness: core.expansionReadiness({ onboardingStatus: 'healthy', reliabilityStatus: 'healthy', capacityHeadroomStatus: 'healthy', dataQualityStatus: 'healthy', coreCapabilityGateStatus: 'passed', groundedResearchGateStatus: 'blocked_provider_unavailable' }),
    productOpportunityCountCategory: opportunities.length ? 'non_zero' : 'none',
    generatedAt: input.generatedAt || new Date().toISOString(),
  });
  d.metrics.increment('analytics_export_status', { status: 'created' });
  await audit('pilot_analytics.export.created', 'PilotAnalyticsExport', artifact.evidenceDigest, s, { evidenceDigest: artifact.evidenceDigest }, d);
  return artifact;
}

async function createBackfill(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  await approval(input, s, 'pilotAnalyticsBackfill.create', 'PilotAnalyticsBackfill', input, d);
  const maximumWindowMs = 90 * 86_400_000;
  if (new Date(input.windowEnd) - new Date(input.windowStart) > maximumWindowMs) throw new AppError(422, 'ANALYTICS_BACKFILL_WINDOW_EXCEEDED', 'Backfill windows are bounded to 90 days.');
  const backfillId = input.backfillId || deterministicId('abf', input, s);
  const record = await d.PilotAnalyticsBackfill.create({ ...input, backfillId, organizationId: s.organizationId, workspaceId: s.workspaceId, status: 'requested', checkpoint: 0, processedCount: 0, createdBy: s.actorId });
  d.metrics.increment('analytics_backfill_status', { status: 'requested' });
  await audit('pilot_analytics.backfill.started', 'PilotAnalyticsBackfill', record, s, { sourceCategory: record.sourceCategory }, d);
  return plain(record);
}

async function listBackfills(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return page(d.PilotAnalyticsBackfill, scopedQuery(s, input), input);
}

async function getBackfill(backfillId, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.PilotAnalyticsBackfill, { backfillId, ...scopedQuery(s, input) }));
}

async function backfillAction(backfillId, action, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotAnalyticsBackfill, { backfillId, ...scopedQuery(s, input) });
  const transitions = { pause: 'paused', resume: 'running', cancel: 'cancelled' };
  if (action === 'resume') await approval(input, s, 'pilotAnalyticsBackfill.resume', 'PilotAnalyticsBackfill', record, d);
  record.status = transitions[action];
  await record.save();
  d.metrics.increment('analytics_backfill_status', { status: record.status });
  return plain(record);
}

async function deleteAnalytics(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const s = scope(input, caller);
  const holds = await d.LegalHold.countDocuments({ organizationId: s.organizationId, ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), status: 'ACTIVE' });
  if (holds) return { deletedCount: 0, status: 'preserved_legal_hold' };
  const query = { ...scopedQuery(s, input), ...(input.subjectReference ? { subjectReference: input.subjectReference } : {}) };
  const result = await d.PilotAnalyticsEvent.deleteMany(query);
  await d.PilotAnalyticsProjection.deleteMany(scopedQuery(s, input));
  await audit('pilot_analytics.retention.deleted', 'PilotAnalyticsEvent', input.pilotProgramId || s.organizationId, s, { deletedCountCategory: result.deletedCount ? 'non_zero' : 'zero' }, d);
  return { deletedCount: result.deletedCount, status: 'completed', idempotent: true, auditEvidencePreserved: true, projectionsCorrected: true };
}

async function ensurePilotAnalyticsIndexes() {
  await Promise.all(Object.values(models).map((Model) => Model.createIndexes()));
}

module.exports = {
  adoption,
  backfillAction,
  capabilityAdoption,
  createBackfill,
  createCohort,
  createEvidence,
  createExperiment,
  createFeedbackTheme,
  createFunnel,
  createHypothesis,
  createMetricDefinition,
  createOpportunity,
  createSnapshot,
  createTrackingPlan,
  deleteAnalytics,
  ensurePilotAnalyticsIndexes,
  evaluateCohort,
  evaluateFunnel,
  expansion,
  experimentAction,
  exportAnalytics,
  feedbackTrends,
  friction,
  getBackfill,
  getCohort,
  getDataQuality,
  getEventDefinition,
  getEvidence,
  getExperiment,
  getFunnel,
  getHypothesis,
  getInstrumentationCoverage,
  getMetricDefinition,
  getOpportunity,
  getRetention,
  getSnapshot,
  getTrackingPlan,
  hypothesisAction,
  ingestEvent,
  listBackfills,
  listCohorts,
  listEventDefinitions,
  listExperiments,
  listFeedbackThemes,
  listFunnels,
  listHypotheses,
  listMetricDefinitions,
  listOpportunities,
  listSnapshots,
  listTrackingPlans,
  metricAction,
  opportunityAction,
  providerImpact,
  recommendations,
  supportTrends,
  trackingPlanAction,
};
