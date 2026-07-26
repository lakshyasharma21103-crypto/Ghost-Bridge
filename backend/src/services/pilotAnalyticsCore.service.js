const crypto = require('node:crypto');
const {
  ANALYTICS_CLASSIFICATIONS,
  ANALYTICS_EVENT_DEFINITIONS,
  COLLECTION_STATES,
  CORE_METRIC_KEYS,
  EVENT_DEFINITION_MAP,
  FEEDBACK_TAXONOMY,
  FUNNEL_DEFINITIONS,
  SECURITY_GUARDRAILS,
} = require('../constants/pilotAnalytics');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_KEY = /^[a-z][a-z0-9_.:-]{0,127}$/;
const PROHIBITED_KEY = /(?:password|secret|token|credential|authorization|cookie|connection.?string|database.?uri|redis.?uri|raw.?prompt|raw.?(?:response|output)|hidden.?reasoning|customer.?payload|orchestration.?(?:input|output)|signed.?url)/i;
const PROHIBITED_VALUE = /(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/[^\s"']+|redis(?:s)?:\/\/[^\s"']+|-----BEGIN [^-]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{8,}|xox[baprs]-[A-Za-z0-9-]{8,}|AIza[0-9A-Za-z_-]{16,})/i;
const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const OPERATIONAL_DOMAINS = new Set(['provider_status', 'capability_gate', 'quota']);

function analyticsError(code, message = code, status = 400, details = []) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function digest(value, algorithm = 'sha256') {
  return `${algorithm}:${crypto.createHash(algorithm).update(JSON.stringify(canonical(value))).digest('hex')}`;
}

function assertSafeId(value, field, required = true) {
  const candidate = String(value || '').trim();
  if ((required || candidate) && !SAFE_ID.test(candidate)) {
    throw analyticsError('ANALYTICS_IDENTIFIER_INVALID', `${field} must be a bounded identifier.`);
  }
  return candidate || undefined;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function inspectPlainData(value, bounds, path = 'properties', depth = 0) {
  if (depth > bounds.maximumObjectDepth) {
    throw analyticsError('ANALYTICS_OBJECT_DEPTH_EXCEEDED', `${path} exceeds the maximum object depth.`);
  }
  if (value === null || ['boolean', 'number'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw analyticsError('ANALYTICS_PROPERTY_INVALID', `${path} must be finite.`);
    }
    return;
  }
  if (typeof value === 'string') {
    if (value.length > bounds.maximumStringLength) {
      throw analyticsError('ANALYTICS_STRING_TOO_LONG', `${path} exceeds its length limit.`);
    }
    if (PROHIBITED_VALUE.test(value)) {
      throw analyticsError('ANALYTICS_SECRET_VALUE_FORBIDDEN', `${path} contains prohibited material.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > bounds.maximumArrayLength) {
      throw analyticsError('ANALYTICS_ARRAY_TOO_LONG', `${path} exceeds its item limit.`);
    }
    value.forEach((item, index) => inspectPlainData(item, bounds, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!isPlainObject(value)) {
    throw analyticsError('ANALYTICS_EXECUTABLE_OBJECT_FORBIDDEN', `${path} must contain plain data.`);
  }
  for (const key of Object.keys(value)) {
    if (PROTOTYPE_KEYS.has(key)) {
      throw analyticsError('ANALYTICS_PROTOTYPE_KEY_FORBIDDEN', `${path}.${key} is prohibited.`);
    }
    if (PROHIBITED_KEY.test(key)) {
      throw analyticsError('ANALYTICS_PROHIBITED_PROPERTY', `${path}.${key} is prohibited.`);
    }
    inspectPlainData(value[key], bounds, `${path}.${key}`, depth + 1);
  }
}

function getEventDefinition(eventKey) {
  const definition = EVENT_DEFINITION_MAP.get(String(eventKey || ''));
  if (!definition) throw analyticsError('ANALYTICS_EVENT_NOT_REGISTERED', 'The event key is not code-defined.', 422);
  return definition;
}

function validateProperties(definition, properties = {}) {
  if (!isPlainObject(properties)) {
    throw analyticsError('ANALYTICS_PROPERTIES_INVALID', 'Event properties must be a plain object.');
  }
  const keys = Object.keys(properties);
  if (keys.length > definition.maximumProperties) {
    throw analyticsError('ANALYTICS_PROPERTY_COUNT_EXCEEDED', 'The event contains too many properties.');
  }
  const allowed = new Set([...definition.requiredProperties, ...definition.optionalProperties]);
  const unexpected = keys.filter((key) => !allowed.has(key));
  if (unexpected.length) {
    throw analyticsError('ANALYTICS_PROPERTY_NOT_REGISTERED', 'The event contains an unregistered property.', 422, unexpected);
  }
  const missing = definition.requiredProperties.filter((key) => properties[key] === undefined);
  if (missing.length) {
    throw analyticsError('ANALYTICS_REQUIRED_PROPERTY_MISSING', 'A required event property is missing.', 422, missing);
  }
  inspectPlainData(properties, definition);
  const serializedBytes = Buffer.byteLength(JSON.stringify(properties), 'utf8');
  if (serializedBytes > definition.maximumSerializedBytes) {
    throw analyticsError('ANALYTICS_EVENT_TOO_LARGE', 'The serialized event exceeds its size limit.', 413);
  }
  return canonical(properties);
}

function consentAllows(collectionState, definition) {
  if (!COLLECTION_STATES.includes(collectionState)) return false;
  if (['disabled', 'withdrawn'].includes(collectionState)) return false;
  if (collectionState === 'minimal_operational') return OPERATIONAL_DOMAINS.has(definition.domain);
  return true;
}

function tenantPseudonym(input, secret) {
  const organizationId = assertSafeId(input.organizationId, 'organizationId');
  const subjectReference = assertSafeId(input.subjectReference, 'subjectReference');
  if (!secret || String(secret).length < 16) {
    throw analyticsError('ANALYTICS_PSEUDONYM_SECRET_REQUIRED', 'A tenant pseudonym secret is required.');
  }
  const material = `${organizationId}\u0000${input.workspaceId || ''}\u0000${subjectReference}`;
  return `psn_v1_${crypto.createHmac('sha256', String(secret)).update(material).digest('base64url').slice(0, 32)}`;
}

function deduplicationKey(input, definition) {
  const scope = [input.pilotProgramId, input.organizationId, input.workspaceId || 'organization'];
  let material;
  if (definition.deduplicationMode === 'source_sequence') {
    material = [...scope, input.sourceCategory, input.sequence];
  } else if (definition.deduplicationMode === 'subject_event_window') {
    const windowMs = Number(input.deduplicationWindowMs || 86_400_000);
    const window = Math.floor(new Date(input.occurredAt).getTime() / windowMs);
    material = [...scope, input.subjectReference, input.eventKey, window];
  } else if (definition.deduplicationMode === 'orchestration_transition') {
    material = [...scope, input.subjectReference, input.eventKey, input.sequence];
  } else {
    material = [...scope, input.idempotencyKey];
  }
  if (material.some((part) => part === undefined || part === '')) {
    throw analyticsError('ANALYTICS_DEDUPLICATION_INPUT_REQUIRED', 'Required deduplication input is missing.');
  }
  return digest(material);
}

function validateTrustedScope(input = {}, trusted = {}) {
  const organizationId = assertSafeId(trusted.organizationId, 'organizationId');
  const workspaceId = assertSafeId(trusted.workspaceId, 'workspaceId', false);
  if (input.organizationId && String(input.organizationId) !== organizationId) {
    throw analyticsError('ANALYTICS_CROSS_TENANT_SCOPE', 'The event organization does not match trusted scope.', 403);
  }
  if (input.workspaceId && String(input.workspaceId) !== String(workspaceId || '')) {
    throw analyticsError('ANALYTICS_CROSS_WORKSPACE_SCOPE', 'The event workspace does not match trusted scope.', 403);
  }
  return { organizationId, workspaceId };
}

function prepareEvent(input = {}, trusted = {}, options = {}) {
  if (!isPlainObject(input)) throw analyticsError('ANALYTICS_EVENT_INVALID', 'The event must be a plain object.');
  const definition = getEventDefinition(input.eventKey);
  if (String(input.eventVersion || definition.version) !== definition.version) {
    throw analyticsError('ANALYTICS_EVENT_VERSION_INVALID', 'The event version is not active.', 422);
  }
  const scope = validateTrustedScope(input, trusted);
  const pilotProgramId = assertSafeId(trusted.pilotProgramId || input.pilotProgramId, 'pilotProgramId');
  if (trusted.pilotProgramId && input.pilotProgramId && trusted.pilotProgramId !== input.pilotProgramId) {
    throw analyticsError('ANALYTICS_PILOT_SCOPE_INVALID', 'The event pilot program does not match trusted scope.', 403);
  }
  if (trusted.releaseVersion && input.releaseVersion && trusted.releaseVersion !== input.releaseVersion) {
    throw analyticsError('ANALYTICS_RELEASE_SCOPE_FORGED', 'Release identity must come from trusted context.', 403);
  }
  const collectionState = trusted.collectionState || 'pilot_standard';
  if (!consentAllows(collectionState, definition)) {
    throw analyticsError('ANALYTICS_COLLECTION_DISABLED', 'Collection state does not permit this event.', 403);
  }
  if (trusted.allowedClassifications && !trusted.allowedClassifications.includes(definition.classification)) {
    throw analyticsError('ANALYTICS_CLASSIFICATION_DENIED', 'The event classification is not allowed.', 403);
  }
  const properties = validateProperties(definition, input.properties || {});
  const occurredAt = new Date(input.occurredAt || options.now || Date.now());
  if (Number.isNaN(occurredAt.getTime())) {
    throw analyticsError('ANALYTICS_TIMESTAMP_INVALID', 'occurredAt must be a valid timestamp.');
  }
  const now = new Date(options.now || Date.now());
  if (occurredAt.getTime() > now.getTime() + 300_000) {
    throw analyticsError('ANALYTICS_TIMESTAMP_FUTURE', 'occurredAt is outside the accepted clock skew.');
  }
  const subjectReference = assertSafeId(trusted.subjectReference || input.subjectReference, 'subjectReference');
  const base = {
    eventKey: definition.eventKey,
    eventVersion: definition.version,
    pilotProgramId,
    ...scope,
    subjectType: input.subjectType || 'pilot_user',
    subjectReference,
    anonymousSubjectKey: options.pseudonymSecret
      ? tenantPseudonym({ ...scope, subjectReference }, options.pseudonymSecret)
      : undefined,
    sessionKey: assertSafeId(input.sessionKey, 'sessionKey', false),
    sequence: input.sequence === undefined ? undefined : Math.max(0, Math.floor(Number(input.sequence))),
    idempotencyKey: assertSafeId(input.idempotencyKey, 'idempotencyKey'),
    releaseCandidateId: trusted.releaseCandidateId,
    releaseVersion: trusted.releaseVersion,
    featureFlagSnapshotVersion: trusted.featureFlagSnapshotVersion,
    capabilityKey: trusted.capabilityKey || input.capabilityKey,
    capabilityGateStatus: trusted.capabilityGateStatus,
    outcomeCategory: trusted.outcomeCategory || input.outcomeCategory,
    safeFailureCode: trusted.safeFailureCode || input.safeFailureCode,
    durationCategory: input.durationCategory,
    countCategory: input.countCategory,
    sourceCategory: trusted.sourceCategory || 'backend',
    properties,
    classification: definition.classification,
    consentState: collectionState,
    samplingState: 'included',
    requestId: trusted.requestId,
    traceId: trusted.traceId,
    occurredAt,
    receivedAt: now,
    expiresAt: new Date(now.getTime() + Number(options.rawEventRetentionMs || 30 * 86_400_000)),
  };
  base.deduplicationKey = deduplicationKey(base, definition);
  return canonical(base);
}

function validateTrackingPlan(plan = {}) {
  const errors = [];
  if (!['platform', 'pilot_program', 'organization', 'workspace'].includes(plan.scope)) errors.push('TRACKING_PLAN_SCOPE_INVALID');
  if (!['disabled', 'minimal', 'standard', 'enhanced'].includes(plan.collectionMode)) errors.push('TRACKING_PLAN_COLLECTION_MODE_INVALID');
  if (!Array.isArray(plan.eventDefinitionKeys) || !plan.eventDefinitionKeys.length) errors.push('TRACKING_PLAN_EVENTS_REQUIRED');
  for (const key of plan.eventDefinitionKeys || []) if (!EVENT_DEFINITION_MAP.has(key)) errors.push('TRACKING_PLAN_EVENT_NOT_REGISTERED');
  for (const key of plan.requiredEventDefinitionKeys || []) if (!plan.eventDefinitionKeys?.includes(key)) errors.push('TRACKING_PLAN_REQUIRED_EVENT_NOT_INCLUDED');
  for (const value of plan.allowedClassifications || []) if (!ANALYTICS_CLASSIFICATIONS.includes(value) || value === 'prohibited') errors.push('TRACKING_PLAN_CLASSIFICATION_INVALID');
  if (Number(plan.maximumEventBytes || 0) < 256 || Number(plan.maximumEventBytes || 0) > 65_536) errors.push('TRACKING_PLAN_EVENT_BYTES_INVALID');
  return { valid: errors.length === 0, safeFailureCodes: [...new Set(errors)].sort() };
}

function validateMetricDefinition(metric = {}) {
  const errors = [];
  if (!SAFE_KEY.test(String(metric.metricKey || ''))) errors.push('METRIC_KEY_INVALID');
  if (!['count', 'percentage', 'basis_points', 'duration_ms', 'rate', 'category'].includes(metric.unit)) errors.push('METRIC_UNIT_INVALID');
  if (['percentage', 'basis_points', 'rate'].includes(metric.unit) && !(metric.denominatorEventKeys || []).length) errors.push('METRIC_DENOMINATOR_REQUIRED');
  if (!['unknown', 'insufficient_data', 'omit'].includes(metric.missingDataBehavior || 'unknown')) errors.push('METRIC_MISSING_DATA_BEHAVIOR_INVALID');
  return { valid: errors.length === 0, safeFailureCodes: [...new Set(errors)].sort() };
}

function boundedPercentage(numerator, denominator, minimumSampleSize = 1) {
  if (denominator === undefined || denominator === null) return { state: 'unknown', value: null, numerator: numerator ?? null, denominator: null };
  const safeDenominator = Math.max(0, Number(denominator));
  const safeNumerator = Math.max(0, Number(numerator || 0));
  if (safeDenominator < minimumSampleSize) return { state: 'insufficient_data', value: null, numerator: safeNumerator, denominator: safeDenominator };
  return { state: 'available', value: Math.round(Math.min(1, safeNumerator / safeDenominator) * 10_000) / 100, numerator: safeNumerator, denominator: safeDenominator };
}

function failureBucket(event) {
  if (event.eventKey === 'pilot.grounded_research.denied_provider' || event.safeFailureCode === 'PROVIDER_UNAVAILABLE') return 'provider_blocked';
  if (event.eventKey === 'pilot.grounded_research.denied_gate' || event.eventKey === 'pilot.capability_gate.blocked') return 'gate_blocked';
  if (event.eventKey === 'pilot.quota.rejected' || event.properties?.quotaOutcome === 'rejected') return 'quota_blocked';
  if (event.safeFailureCode === 'POLICY_DENIED') return 'policy_denied';
  if (event.safeFailureCode) return 'platform_blocked';
  return 'unknown';
}

function evaluateFunnel(events = [], definition = FUNNEL_DEFINITIONS.onboarding, options = {}) {
  const subjects = new Map();
  const sorted = [...events].sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
  for (const event of sorted) {
    const key = event.anonymousSubjectKey || event.subjectReference;
    if (!key) continue;
    const current = subjects.get(key) || [];
    current.push(event);
    subjects.set(key, current);
  }
  const entered = subjects.size;
  const steps = definition.orderedSteps.map((eventKey, index) => {
    let completed = 0;
    let platformBlocked = 0;
    let gateBlocked = 0;
    let quotaBlocked = 0;
    let providerBlocked = 0;
    const durations = [];
    for (const subjectEvents of subjects.values()) {
      const current = subjectEvents.find((event) => event.eventKey === eventKey);
      if (current) {
        completed += 1;
        if (index) {
          const previous = subjectEvents.find((event) => event.eventKey === definition.orderedSteps[index - 1]);
          if (previous) durations.push(new Date(current.occurredAt) - new Date(previous.occurredAt));
        }
      }
      for (const event of subjectEvents) {
        const bucket = failureBucket(event);
        if (bucket === 'platform_blocked') platformBlocked += 1;
        if (bucket === 'gate_blocked') gateBlocked += 1;
        if (bucket === 'quota_blocked') quotaBlocked += 1;
        if (bucket === 'provider_blocked') providerBlocked += 1;
      }
    }
    return {
      step: index + 1,
      eventKey,
      entered,
      completed,
      conversion: boundedPercentage(completed, entered, Number(options.minimumSampleSize || 1)),
      dropOff: Math.max(0, entered - completed - gateBlocked - quotaBlocked - providerBlocked - platformBlocked),
      platformBlocked,
      gateBlocked,
      quotaBlocked,
      providerBlocked,
      medianDurationCategory: durationCategory(median(durations)),
    };
  });
  return { funnelKey: definition.funnelKey, version: definition.version, denominator: entered, steps, correlationOnly: true };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function durationCategory(durationMs) {
  if (durationMs === null || durationMs === undefined || Number.isNaN(durationMs)) return 'unknown';
  if (durationMs < 60_000) return 'under_1_minute';
  if (durationMs < 900_000) return 'under_15_minutes';
  if (durationMs < 3_600_000) return 'under_1_hour';
  if (durationMs < 86_400_000) return 'under_1_day';
  return 'one_day_or_more';
}

function suppressSmallCohort(result, minimumSize = 5) {
  const size = Number(result.cohortSize ?? result.denominator ?? 0);
  if (size < minimumSize) {
    return { state: 'suppressed_small_cohort', cohortSizeCategory: size === 0 ? 'none' : 'below_threshold', minimumCohortSize: minimumSize };
  }
  return { state: 'available', ...result, minimumCohortSize: minimumSize };
}

function evaluateRetention(input = {}) {
  const entry = new Map((input.entryEvents || []).map((event) => [event.anonymousSubjectKey || event.subjectReference, new Date(event.occurredAt)]));
  const activity = input.activityEvents || [];
  const periods = input.periods || [1, 7, 14, 30];
  const values = {};
  for (const period of periods) {
    const retained = new Set();
    for (const event of activity) {
      const subject = event.anonymousSubjectKey || event.subjectReference;
      const enteredAt = entry.get(subject);
      if (!enteredAt) continue;
      const days = (new Date(event.occurredAt) - enteredAt) / 86_400_000;
      if (days >= period && days < period + 1) retained.add(subject);
    }
    values[`day${period}`] = boundedPercentage(retained.size, entry.size, Number(input.minimumCohortSize || 1));
  }
  return suppressSmallCohort({ cohortSize: entry.size, denominator: entry.size, periods: values }, Number(input.minimumCohortSize || 5));
}

function adoptionSegment(input = {}) {
  if (input.withdrawn) return 'withdrawn';
  if (input.providerBlocked || input.gateBlocked) return input.providerBlocked ? 'platform_blocked' : 'gate_blocked';
  if (input.quotaConstrained) return 'quota_constrained';
  if (!input.onboardingStarted) return 'not_onboarded';
  if (!input.onboardingCompleted) return 'onboarding';
  if (input.advancedCapabilityUsed) return 'advanced_capability_user';
  if (input.repeatUse) return input.supportAssisted ? 'support_assisted' : 'repeat_user';
  if (input.firstValueReached) return 'first_value_reached';
  if (input.activated) return 'activated';
  if (input.dormant) return 'dormant';
  return 'unknown';
}

function instrumentationCoverage(input = {}) {
  const required = [...new Set(input.requiredEventDefinitionKeys || [])].sort();
  const observed = new Set((input.events || []).map((event) => event.eventKey));
  const missing = required.filter((key) => !observed.has(key));
  const invalid = [...new Set(input.invalidEventDefinitionKeys || [])].sort();
  const unexpected = [...observed].filter((key) => !EVENT_DEFINITION_MAP.has(key)).sort();
  const schemaFailureCount = Number(input.schemaFailureCount || 0);
  const status = invalid.length || unexpected.length
    ? 'invalid'
    : missing.length
      ? 'incomplete'
      : schemaFailureCount
        ? 'complete_with_warnings'
        : 'complete';
  return {
    requiredEventCount: required.length,
    observedEventCount: required.filter((key) => observed.has(key)).length,
    missingEventDefinitionKeys: missing,
    invalidEventDefinitionKeys: invalid,
    unexpectedEventDefinitionKeys: unexpected,
    schemaFailureCount,
    deduplicationCount: Number(input.deduplicationCount || 0),
    redactionCount: Number(input.redactionCount || 0),
    samplingCount: Number(input.samplingCount || 0),
    status,
    generatedAt: new Date(input.now || 0).toISOString(),
  };
}

function evaluateDataQuality(input = {}) {
  const warnings = [];
  if (Number(input.schemaFailureCount || 0)) warnings.push('SCHEMA_FAILURES_PRESENT');
  if (Number(input.duplicateCount || 0)) warnings.push('DUPLICATES_OBSERVED');
  if (Number(input.sequenceGapCount || 0)) warnings.push('SOURCE_SEQUENCE_GAPS');
  if (Number(input.timestampAnomalyCount || 0)) warnings.push('TIMESTAMP_ANOMALIES');
  if (Number(input.scopeMismatchCount || 0)) warnings.push('SCOPE_MISMATCH');
  if (input.instrumentationStatus === 'incomplete') warnings.push('REQUIRED_INSTRUMENTATION_MISSING');
  if (input.backfillStatus === 'failed') warnings.push('BACKFILL_FAILED');
  const status = warnings.includes('SCOPE_MISMATCH') || warnings.includes('SCHEMA_FAILURES_PRESENT')
    ? 'invalid'
    : warnings.length > 2
      ? 'degraded'
      : warnings.length
        ? 'warning'
        : 'healthy';
  return { status, safeWarnings: warnings.sort(), evaluatedAt: new Date(input.now || 0).toISOString() };
}

function projectEvents(events = [], input = {}) {
  const checkpoint = Number(input.checkpoint || 0);
  const limit = Math.max(1, Math.min(Number(input.batchSize || 100), 500));
  const source = [...events]
    .filter((event) => Number(event.sequence || 0) > checkpoint)
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0))
    .slice(0, limit);
  const existing = new Map((input.existing || []).map((record) => [record.projectionKey, { ...record }]));
  for (const event of source) {
    const day = new Date(event.occurredAt).toISOString().slice(0, 10);
    const projectionKey = [event.pilotProgramId, event.organizationId, event.workspaceId || 'organization', day, event.eventKey].join(':');
    const current = existing.get(projectionKey) || { projectionKey, eventKey: event.eventKey, day, count: 0, sourceKeys: [] };
    if (!current.sourceKeys.includes(event.deduplicationKey)) {
      current.count += 1;
      current.sourceKeys = [...current.sourceKeys, event.deduplicationKey].sort();
    }
    existing.set(projectionKey, current);
  }
  const nextCheckpoint = source.length ? Math.max(...source.map((event) => Number(event.sequence || 0))) : checkpoint;
  return {
    status: source.length === limit && input.interruptAfterBatch ? 'interrupted' : 'active',
    checkpoint: nextCheckpoint,
    processed: source.length,
    projections: [...existing.values()].sort((left, right) => left.projectionKey.localeCompare(right.projectionKey)),
  };
}

function backfillCheckpoint(input = {}) {
  const current = Math.max(0, Number(input.checkpoint || 0));
  const processed = Math.max(0, Math.min(Number(input.processed || 0), Number(input.maximumBatchSize || 500)));
  return { checkpoint: current + processed, status: processed ? 'running' : 'completed', restartSafe: true };
}

const TAXONOMY_RULES = Object.freeze({
  onboarding_confusion: ['onboarding', 'setup', 'getting started'],
  navigation_difficulty: ['navigation', 'find', 'menu'],
  missing_documentation: ['documentation', 'docs', 'guide'],
  agent_connection: ['connection', 'install'],
  delegation: ['delegation', 'delegate'],
  approval_flow: ['approval', 'approve'],
  provider_availability: ['provider', 'unavailable', '503'],
  quota_friction: ['quota', 'limit'],
  performance: ['slow', 'latency'],
  reliability: ['failure', 'failed', 'retry'],
});

function feedbackTaxonomy(input = {}) {
  if (FEEDBACK_TAXONOMY.includes(input.selectedCategory)) {
    return { category: input.selectedCategory, source: 'submitter_selected', confirmed: true };
  }
  if (FEEDBACK_TAXONOMY.includes(input.operatorCategory)) {
    return { category: input.operatorCategory, source: 'operator_triage', confirmed: true };
  }
  const text = String(input.safeText || '').toLowerCase().slice(0, 2_000);
  const suggestion = Object.entries(TAXONOMY_RULES).find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] || 'other';
  return { category: suggestion, source: 'deterministic_suggestion', confirmed: false };
}

function countCategory(value) {
  const count = Number(value || 0);
  if (!count) return 'none';
  if (count < 3) return 'few';
  if (count < 10) return 'several';
  if (count < 50) return 'many';
  return 'very_many';
}

function aggregateFeedbackThemes(records = [], options = {}) {
  const grouped = new Map();
  for (const record of records) {
    const category = FEEDBACK_TAXONOMY.includes(record.category) ? record.category : 'other';
    const current = grouped.get(category) || { count: 0, organizations: new Set(), capabilities: new Set(), severe: 0 };
    current.count += 1;
    if (record.organizationId) current.organizations.add(record.organizationId);
    if (record.affectedCapabilityKey) current.capabilities.add(record.affectedCapabilityKey);
    if (['high', 'critical'].includes(record.severity)) current.severe += 1;
    grouped.set(category, current);
  }
  return [...grouped.entries()].map(([themeKey, value]) => ({
    pilotProgramId: options.pilotProgramId,
    themeKey,
    version: '1',
    displayName: themeKey.replaceAll('_', ' '),
    status: 'active',
    sourceCategoryKeys: [themeKey],
    affectedCapabilityKeys: [...value.capabilities].sort(),
    feedbackCountCategory: countCategory(value.count),
    affectedOrganizationCountCategory: countCategory(value.organizations.size),
    severityCategory: value.severe ? 'elevated' : 'standard',
    trendCategory: 'insufficient_data',
    confidenceCategory: value.count >= 10 ? 'high' : value.count >= 3 ? 'medium' : 'low',
  })).sort((left, right) => left.themeKey.localeCompare(right.themeKey));
}

function feedbackPriority(input = {}) {
  if (input.crossTenantFinding || input.securityFinding) return 'urgent';
  const score =
    ({ low: 0, medium: 2, high: 4, critical: 8 }[input.severity] || 0) +
    Math.min(5, Number(input.affectedOrganizations || 0)) +
    Math.min(3, Number(input.recurrence || 0)) +
    (input.activationImpact ? 3 : 0) +
    (input.reliabilityImpact ? 3 : 0) +
    (input.workaroundAvailable ? 0 : 2);
  if (!score) return 'insufficient_evidence';
  if (score >= 12) return 'urgent';
  if (score >= 7) return 'high';
  if (score >= 3) return 'standard';
  return 'low';
}

function opportunityScore(input = {}) {
  const impact = { low: 1, medium: 2, high: 3, critical: 4 }[input.impactCategory] || 0;
  const confidence = { low: 1, medium: 2, high: 3 }[input.confidenceCategory] || 0;
  const effort = { low: 1, medium: 2, high: 3 }[input.effortCategory] || 2;
  const risk = { low: 0, medium: 1, high: 2, critical: 4 }[input.riskCategory] || 0;
  return { score: Math.max(0, impact * confidence * 10 - effort * 3 - risk * 5), advisory: true };
}

function validateHypothesis(input = {}) {
  const errors = [];
  if (!SAFE_KEY.test(String(input.hypothesisKey || ''))) errors.push('HYPOTHESIS_KEY_INVALID');
  if (!Array.isArray(input.expectedMetricKeys) || !input.expectedMetricKeys.length) errors.push('HYPOTHESIS_METRICS_REQUIRED');
  for (const key of [...(input.expectedMetricKeys || []), ...(input.guardrailMetricKeys || [])]) {
    if (!CORE_METRIC_KEYS.includes(key)) errors.push('HYPOTHESIS_METRIC_NOT_REGISTERED');
  }
  if (!['increase', 'decrease', 'maintain'].includes(input.expectedDirection)) errors.push('HYPOTHESIS_DIRECTION_INVALID');
  return { valid: !errors.length, safeFailureCodes: [...new Set(errors)].sort() };
}

function validateExperiment(input = {}) {
  const errors = [];
  const variants = input.variants || [];
  const allocations = input.allocationBasisPoints || [];
  if (variants.length < 2 || variants.length > 10) errors.push('EXPERIMENT_VARIANTS_INVALID');
  if (variants.length !== allocations.length || allocations.reduce((sum, value) => sum + Number(value || 0), 0) !== 10_000) errors.push('EXPERIMENT_ALLOCATION_INVALID');
  if (!['simulation', 'local', 'integration', 'staging', 'pilot'].includes(input.environmentCategory)) errors.push('EXPERIMENT_ENVIRONMENT_INVALID');
  if (!['organization', 'workspace', 'user'].includes(input.assignmentUnit)) errors.push('EXPERIMENT_ASSIGNMENT_UNIT_INVALID');
  const forbidden = new Set(['authorization', 'rbac', 'tenant_isolation', 'encryption', 'stale_writer_fencing', 'data_residency', 'external.grounded_research']);
  if ((input.featureFlagKeys || []).some((key) => forbidden.has(key))) errors.push('EXPERIMENT_SECURITY_CONTROL_FORBIDDEN');
  if (input.enableGroundedResearch) errors.push('EXPERIMENT_GROUNDED_RESEARCH_FORBIDDEN');
  if ((input.stopConditions || []).some((condition) => typeof condition === 'function')) errors.push('EXPERIMENT_EXECUTABLE_CONDITION_FORBIDDEN');
  return { valid: !errors.length, safeFailureCodes: [...new Set(errors)].sort(), securityControlsPreserved: true };
}

function assignExperiment(input = {}, secret) {
  const validation = validateExperiment(input.experiment || input);
  if (!validation.valid) throw analyticsError(validation.safeFailureCodes[0], 'The experiment is invalid.');
  if (!secret || String(secret).length < 16) throw analyticsError('EXPERIMENT_ASSIGNMENT_SECRET_REQUIRED');
  const experiment = input.experiment || input;
  const organizationId = assertSafeId(input.organizationId, 'organizationId');
  const unitReference = assertSafeId(input.unitReference, 'unitReference');
  const material = [organizationId, experiment.experimentId || experiment.name, experiment.version, experiment.assignmentUnit, unitReference].join('\u0000');
  const bytes = crypto.createHmac('sha256', secret).update(material).digest();
  const bucket = bytes.readUInt32BE(0) % 10_000;
  let upper = 0;
  let variantKey = experiment.variants.at(-1)?.key || experiment.variants.at(-1);
  for (let index = 0; index < experiment.variants.length; index += 1) {
    upper += Number(experiment.allocationBasisPoints[index]);
    if (bucket < upper) {
      variantKey = experiment.variants[index].key || experiment.variants[index];
      break;
    }
  }
  return {
    variantKey,
    assignmentBucket: bucket,
    assignmentDigestVersion: 'hmac_sha256_v1',
    assignmentKey: digest([material, variantKey]),
    assigned: true,
    exposed: false,
    authorizationAuthority: false,
  };
}

function recordExposure(existing = [], input = {}) {
  if (!input.eligible || !input.renderedOrApplied || !input.featureAvailable || !input.gatePermitted || input.excluded || !input.collectionAllowed) {
    return { recorded: false, safeReasonCode: 'EXPERIMENT_EXPOSURE_INELIGIBLE', exposures: [...existing] };
  }
  const exposureKey = digest([input.experimentId, input.experimentVersion, input.assignmentKey, input.variantKey, input.exposureKey || 'default']);
  if (existing.some((item) => item.exposureKey === exposureKey)) return { recorded: false, duplicate: true, exposures: [...existing] };
  return { recorded: true, duplicate: false, exposures: [...existing, { exposureKey, variantKey: input.variantKey, occurredAt: new Date(input.occurredAt || 0).toISOString() }] };
}

function evaluateGuardrails(values = {}) {
  const securityViolation = SECURITY_GUARDRAILS.find((key) => Number(values[key] || 0) > 0);
  if (securityViolation) return { outcome: 'stop', status: 'stopped_guardrail', safeReasonCode: securityViolation.toUpperCase(), securityControlsPreserved: true };
  const breached = Object.entries(values).find(([key, value]) => key.endsWith('_breach') && value === true);
  return breached
    ? { outcome: 'pause', status: 'stopped_guardrail', safeReasonCode: String(breached[0]).toUpperCase(), securityControlsPreserved: true }
    : { outcome: 'continue', status: 'healthy', securityControlsPreserved: true };
}

function evaluateExperiment(input = {}) {
  const guardrails = evaluateGuardrails(input.guardrails || {});
  if (guardrails.outcome !== 'continue') return { result: 'stopped_guardrail', guardrails, denominator: Number(input.exposedCount || 0), environmentCategory: input.environmentCategory };
  const denominator = Number(input.exposedCount || 0);
  if (input.dataQualityStatus === 'invalid') return { result: 'invalid_data', denominator, guardrails };
  if (denominator < Number(input.minimumSampleSize || 1)) return { result: 'insufficient_data', denominator, guardrails };
  const control = Number(input.controlRate);
  const treatment = Number(input.treatmentRate);
  if (!Number.isFinite(control) || !Number.isFinite(treatment)) return { result: 'inconclusive', denominator, guardrails };
  const delta = treatment - control;
  return {
    result: Math.abs(delta) < Number(input.minimumMeaningfulDelta || 0.01) ? 'neutral' : delta > 0 ? 'positive' : 'negative',
    denominator,
    observationWindowMs: Number(input.observationWindowMs || 0),
    variantCounts: canonical(input.variantCounts || {}),
    guardrails,
    environmentCategory: input.environmentCategory,
    causalClaim: false,
  };
}

function classifyFriction(input = {}) {
  if (input.providerUnavailable) return 'provider_unavailable';
  if (input.capabilityGateBlocked) return 'capability_gate_blocked';
  if (input.quotaRejected) return 'quota_rejected';
  if (input.policyDenied) return 'policy_denied';
  if (input.approvalWait) return 'approval_wait';
  if (input.onboardingIncomplete) return 'onboarding_incomplete';
  if (input.connectionInstallFailed) return 'connection_install_failed';
  if (input.queueDelay) return 'queue_delay';
  if (input.runtimeFailure) return 'runtime_failure';
  if (input.documentationGap) return 'documentation_gap';
  return 'unknown';
}

function providerOutageImpact(input = {}) {
  const events = input.events || [];
  const unavailable = events.filter((event) => event.eventKey === 'pilot.provider.unavailable');
  const denials = events.filter((event) => event.eventKey === 'pilot.grounded_research.denied_provider');
  const organizations = new Set(denials.map((event) => event.organizationId));
  const workspaces = new Set(denials.map((event) => event.workspaceId).filter(Boolean));
  return {
    providerCategory: 'gemini',
    providerState: input.providerState || (unavailable.length ? 'unavailable' : 'unknown'),
    outageWindowCount: unavailable.length,
    affectedRequestCount: denials.length,
    groundedResearchDenialCount: denials.length,
    affectedOrganizationCategory: countCategory(organizations.size),
    affectedWorkspaceCategory: countCategory(workspaces.size),
    supportCaseCount: Number(input.supportCaseCount || 0),
    feedbackCount: Number(input.feedbackCount || 0),
    recoveryTimestamp: input.recoveryTimestamp || null,
    capabilityGateStatus: input.capabilityGateStatus || 'blocked_provider_unavailable',
    killSwitchStatus: input.killSwitchStatus || 'inactive',
    externalFlowStatus: 'deferred',
    coreOrchestrationStatus: 'available',
    voluntaryAbandonmentCount: 0,
  };
}

function adoptionRecommendations(input = {}) {
  const recommendations = [];
  if (input.providerImpact?.capabilityGateStatus !== 'passed') {
    recommendations.push({
      recommendationKey: 'provider_gate_must_pass',
      evidenceReferences: ['capability_gate:external.grounded_research'],
      metricKeys: ['grounded_research_denied_provider_count'],
      funnelKeys: ['pilot_capability_adoption'],
      confidenceCategory: 'high',
      expectedBenefitCategory: 'safety_and_reliability',
      riskCategory: 'critical',
      limitations: ['Provider verification remains manual.', 'Recommendation does not enable the capability.'],
      advisory: true,
    });
  }
  if (input.instrumentationStatus !== 'complete') {
    recommendations.push({ recommendationKey: 'collect_more_evidence', evidenceReferences: ['instrumentation_coverage'], metricKeys: [], funnelKeys: [], confidenceCategory: 'high', expectedBenefitCategory: 'evidence_quality', riskCategory: 'low', limitations: ['Missing data is not zero.'], advisory: true });
  }
  if (input.onboardingDropoff) {
    recommendations.push({ recommendationKey: 'improve_onboarding_step', evidenceReferences: [input.onboardingDropoff], metricKeys: ['onboarding_completion_rate'], funnelKeys: ['pilot_onboarding'], confidenceCategory: 'medium', expectedBenefitCategory: 'activation', riskCategory: 'low', limitations: ['Correlation does not establish cause.'], advisory: true });
  }
  return recommendations;
}

function expansionReadiness(input = {}) {
  const blocked = [];
  if (Number(input.securityFindings || 0)) blocked.push('SECURITY_FINDINGS_PRESENT');
  if (Number(input.severeIncidents || 0)) blocked.push('SEVERE_INCIDENTS_PRESENT');
  if (['invalid', 'degraded', 'unknown'].includes(input.dataQualityStatus)) blocked.push('DATA_QUALITY_INSUFFICIENT');
  if (input.coreCapabilityGateStatus && input.coreCapabilityGateStatus !== 'passed') blocked.push('CORE_CAPABILITY_GATE_BLOCKED');
  const groundedResearchBlocked = input.groundedResearchGateStatus !== 'passed';
  const coreReady = !blocked.length && input.onboardingStatus === 'healthy' && input.reliabilityStatus === 'healthy' && input.capacityHeadroomStatus === 'healthy';
  return {
    outcome: blocked.length ? 'blocked' : coreReady ? (groundedResearchBlocked ? 'ready_with_restrictions' : 'ready') : 'extend_observation',
    coreOrchestration: coreReady ? 'ready' : 'not_ready',
    groundedResearch: groundedResearchBlocked ? 'blocked' : 'approval_required',
    restrictions: groundedResearchBlocked ? ['external.grounded_research'] : [],
    safeFailureCodes: blocked,
    advisory: true,
    automaticExpansion: false,
  };
}

function immutableArtifact(kind, input = {}) {
  const safe = sanitizeExport(input);
  const withoutDigest = { artifactKind: kind, ...safe, generatedAt: safe.generatedAt || new Date(0).toISOString(), immutable: true };
  return Object.freeze({ ...withoutDigest, evidenceDigest: digest(withoutDigest) });
}

function analyticsSnapshot(input = {}) {
  return immutableArtifact('pilot_analytics_snapshot', input);
}

function productLearningEvidence(input = {}) {
  return immutableArtifact('pilot_product_learning_evidence', input);
}

function sanitizeExport(value, path = '') {
  if (Array.isArray(value)) return value.slice(0, 1_000).map((item, index) => sanitizeExport(item, `${path}[${index}]`));
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (PROTOTYPE_KEYS.has(key) || PROHIBITED_KEY.test(key)) continue;
      if (/(?:subjectReference|userId|email|eventId|requestId|traceId|rawProperties|properties|safeSummary|statement)$/i.test(key)) continue;
      output[key] = sanitizeExport(item, `${path}.${key}`);
    }
    return canonical(output);
  }
  if (typeof value === 'string') {
    if (PROHIBITED_VALUE.test(value)) return '[REDACTED]';
    return value.slice(0, 2_000);
  }
  return value;
}

function safeAnalyticsExport(input = {}) {
  const allowed = [
    'metricDefinitions',
    'funnelDefinitions',
    'cohortDefinitions',
    'trackingPlanMetadata',
    'aggregatedUsage',
    'aggregatedReliability',
    'aggregatedSupport',
    'feedbackThemes',
    'experimentSummaries',
    'adoptionRecommendations',
    'expansionReadiness',
    'generatedAt',
  ];
  return immutableArtifact('pilot_analytics_export', Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])));
}

function deletionEligibility(record = {}, input = {}) {
  if (input.legalHoldActive || record.legalHold === true) return { eligible: false, reason: 'LEGAL_HOLD_ACTIVE' };
  if (record.auditEvidence === true) return { eligible: false, reason: 'IMMUTABLE_AUDIT_EVIDENCE' };
  const matches =
    (!input.organizationId || record.organizationId === input.organizationId) &&
    (!input.workspaceId || record.workspaceId === input.workspaceId) &&
    (!input.subjectReference || record.subjectReference === input.subjectReference);
  return { eligible: matches, reason: matches ? 'RETENTION_DELETION_ELIGIBLE' : 'OUT_OF_SCOPE' };
}

function deleteEligibleAnalytics(records = [], input = {}) {
  const retained = [];
  const deletedKeys = [];
  for (const record of records) {
    const decision = deletionEligibility(record, input);
    if (decision.eligible) deletedKeys.push(record.deduplicationKey || record.id);
    else retained.push(record);
  }
  return { retained, deletedKeys: deletedKeys.sort(), deletedCount: deletedKeys.length, idempotent: true, projectionsRequireCorrection: deletedKeys.length > 0 };
}

module.exports = {
  adoptionRecommendations,
  adoptionSegment,
  aggregateFeedbackThemes,
  analyticsError,
  analyticsSnapshot,
  assignExperiment,
  backfillCheckpoint,
  boundedPercentage,
  canonical,
  classifyFriction,
  consentAllows,
  deduplicationKey,
  deleteEligibleAnalytics,
  deletionEligibility,
  digest,
  durationCategory,
  evaluateDataQuality,
  evaluateExperiment,
  evaluateFunnel,
  evaluateGuardrails,
  evaluateRetention,
  expansionReadiness,
  feedbackPriority,
  feedbackTaxonomy,
  getEventDefinition,
  immutableArtifact,
  instrumentationCoverage,
  isPlainObject,
  opportunityScore,
  prepareEvent,
  productLearningEvidence,
  projectEvents,
  providerOutageImpact,
  recordExposure,
  safeAnalyticsExport,
  sanitizeExport,
  suppressSmallCohort,
  tenantPseudonym,
  validateExperiment,
  validateHypothesis,
  validateMetricDefinition,
  validateProperties,
  validateTrackingPlan,
  validateTrustedScope,
};
