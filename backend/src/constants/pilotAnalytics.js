const ANALYTICS_CLASSIFICATIONS = Object.freeze([
  'operational_metadata',
  'product_usage',
  'onboarding_progress',
  'capability_usage',
  'performance_summary',
  'reliability_summary',
  'support_summary',
  'feedback_summary',
  'experiment_exposure',
  'experiment_outcome',
  'sensitive_restricted',
  'prohibited',
]);

const COLLECTION_STATES = Object.freeze([
  'disabled',
  'minimal_operational',
  'pilot_standard',
  'enhanced_opt_in',
  'withdrawn',
]);

const COMMON_PROPERTIES = Object.freeze([
  'itemKey',
  'roleCategory',
  'statusCategory',
  'outcomeCategory',
  'safeFailureCode',
  'durationCategory',
  'countCategory',
  'gateState',
  'providerState',
  'quotaOutcome',
  'regionCategory',
  'dataClassificationCategory',
  'supportCategory',
  'feedbackCategory',
  'experimentKey',
  'variantKey',
  'guardrailKey',
  'releaseVersion',
  'featureFlagVersion',
  'definitionVersion',
  'sourceSequence',
  'supportAssisted',
  'successful',
  'repeated',
]);

const DOMAIN_EVENTS = Object.freeze({
  onboarding: [
    'pilot.onboarding.started',
    'pilot.onboarding.item_completed',
    'pilot.onboarding.completed',
    'pilot.onboarding.approved',
  ],
  capability_discovery: [
    'pilot.capability.list_viewed',
    'pilot.capability.detail_viewed',
    'pilot.capability.access_requested',
    'pilot.capability.access_denied',
    'pilot.capability.first_used',
    'pilot.capability.repeated_use',
  ],
  agent_passport: [
    'pilot.passport.list_viewed',
    'pilot.passport.detail_viewed',
  ],
  agent_connection: [
    'pilot.connection.install_started',
    'pilot.connection.install_completed',
    'pilot.connection.install_failed',
    'pilot.connection.revoked',
  ],
  orchestration: [
    'pilot.orchestration.definition_created',
    'pilot.orchestration.definition_validated',
    'pilot.orchestration.definition_activated',
    'pilot.orchestration.run_submitted',
    'pilot.orchestration.run_accepted',
    'pilot.orchestration.run_deferred',
    'pilot.orchestration.run_rejected',
    'pilot.orchestration.run_started',
    'pilot.orchestration.run_completed',
    'pilot.orchestration.run_failed',
    'pilot.orchestration.run_cancelled',
  ],
  delegation: [
    'pilot.delegation.requested',
    'pilot.delegation.approved',
    'pilot.delegation.invoked',
    'pilot.delegation.completed',
    'pilot.delegation.failed',
  ],
  recovery: [
    'pilot.recovery.started',
    'pilot.recovery.completed',
    'pilot.recovery.failed',
  ],
  compensation: [
    'pilot.compensation.started',
    'pilot.compensation.completed',
    'pilot.compensation.failed',
  ],
  approval: [
    'pilot.approval.requested',
    'pilot.approval.completed',
    'pilot.approval.expired',
    'pilot.approval.resume_completed',
  ],
  feedback: [
    'pilot.feedback.submitted',
    'pilot.feedback.triaged',
    'pilot.feedback.resolved',
  ],
  support: [
    'pilot.support_case.created',
    'pilot.support_case.acknowledged',
    'pilot.support_case.resolved',
  ],
  capability_gate: [
    'pilot.capability_gate.blocked',
    'pilot.capability_gate.passed',
    'pilot.capability_gate.expired',
    'pilot.grounded_research.denied_gate',
    'pilot.grounded_research.denied_provider',
  ],
  provider_status: [
    'pilot.provider.unavailable',
    'pilot.provider.recovered',
  ],
  pilot_admission: [
    'pilot.enrollment.approved',
    'pilot.roles.assigned',
    'pilot.capability_restrictions.acknowledged',
  ],
  quota: [
    'pilot.quota.accepted',
    'pilot.quota.rejected',
  ],
  experiment: [
    'pilot.experiment.eligible',
    'pilot.experiment.exposed',
    'pilot.experiment.converted',
    'pilot.experiment.guardrail_triggered',
    'pilot.experiment.withdrawn',
  ],
});

const CLASSIFICATION_BY_DOMAIN = Object.freeze({
  onboarding: 'onboarding_progress',
  capability_discovery: 'capability_usage',
  agent_passport: 'product_usage',
  agent_connection: 'capability_usage',
  orchestration: 'product_usage',
  delegation: 'capability_usage',
  recovery: 'reliability_summary',
  compensation: 'reliability_summary',
  approval: 'product_usage',
  feedback: 'feedback_summary',
  support: 'support_summary',
  capability_gate: 'operational_metadata',
  provider_status: 'reliability_summary',
  pilot_admission: 'onboarding_progress',
  quota: 'operational_metadata',
  experiment: 'experiment_exposure',
});

function eventDefinition(eventKey, domain) {
  const requiredProperties =
    eventKey === 'pilot.onboarding.item_completed' ? ['itemKey'] :
    eventKey.startsWith('pilot.experiment.') ? ['experimentKey'] :
    [];
  const optionalProperties = COMMON_PROPERTIES.filter((key) => !requiredProperties.includes(key));
  return Object.freeze({
    eventKey,
    version: '1',
    displayName: eventKey.split('.').slice(1).join(' ').replaceAll('_', ' '),
    description: `Bounded ${domain.replaceAll('_', ' ')} pilot analytics event.`,
    domain,
    classification: CLASSIFICATION_BY_DOMAIN[domain],
    allowedScopes: ['pilot_program', 'organization', 'workspace'],
    requiredProperties,
    optionalProperties,
    prohibitedProperties: [
      'authorization',
      'cookie',
      'password',
      'runtimeToken',
      'installKey',
      'providerApiKey',
      'databaseUri',
      'redisUri',
      'rawPrompt',
      'rawResponse',
      'hiddenReasoning',
      'orchestrationInput',
      'orchestrationOutput',
      'customerPayload',
    ],
    maximumSerializedBytes: 8_192,
    maximumProperties: 24,
    maximumStringLength: 256,
    maximumArrayLength: 16,
    maximumObjectDepth: 4,
    deduplicationMode: eventKey.includes('repeated_use') ? 'subject_event_window' : 'idempotency_key',
    retentionCategory: domain === 'experiment' ? 'experiment' : 'raw_analytics',
    consentCategory: ['provider_status', 'capability_gate', 'quota'].includes(domain)
      ? 'minimal_operational'
      : 'pilot_standard',
    samplingCategory: 'unsampled_pilot',
    projectionTargets: [`pilot_${domain}_daily`],
    metricDefinitionKeys: [],
    funnelDefinitionKeys: [],
  });
}

const ANALYTICS_EVENT_DEFINITIONS = Object.freeze(
  Object.entries(DOMAIN_EVENTS)
    .flatMap(([domain, keys]) => keys.map((key) => eventDefinition(key, domain)))
    .sort((left, right) => left.eventKey.localeCompare(right.eventKey)),
);

const EVENT_DEFINITION_MAP = new Map(
  ANALYTICS_EVENT_DEFINITIONS.map((definition) => [definition.eventKey, definition]),
);

const CORE_METRIC_KEYS = Object.freeze([
  'onboarding_started_count',
  'onboarding_completed_count',
  'onboarding_completion_rate',
  'median_onboarding_completion_category',
  'onboarding_blocked_count',
  'onboarding_dropoff_step',
  'activated_organization_count',
  'activated_workspace_count',
  'activated_user_count',
  'first_successful_orchestration_rate',
  'time_to_first_success_category',
  'first_agent_connection_rate',
  'first_definition_activation_rate',
  'active_organization_count',
  'active_workspace_count',
  'active_user_count',
  'orchestration_submission_count',
  'successful_run_count',
  'repeat_orchestration_user_count',
  'active_days_category',
  'session_frequency_category',
  'capability_discovery_rate',
  'capability_first_use_rate',
  'capability_repeat_use_rate',
  'delegation_adoption_rate',
  'recovery_adoption_rate',
  'compensation_adoption_rate',
  'approval_flow_adoption_rate',
  'observability_usage_rate',
  'successful_adoption_rate',
  'adoption_blocked_by_platform_rate',
  'adoption_blocked_by_gate_rate',
  'adoption_blocked_by_quota_rate',
  'adoption_blocked_by_provider_rate',
  'feedback_submission_count',
  'support_case_count',
  'support_acknowledgement_category',
  'support_resolution_category',
  'unresolved_support_age_category',
  'cross_tenant_violation_count',
  'credential_exposure_finding_count',
  'residency_violation_count',
  'stale_writer_violation_count',
  'severe_incident_count',
  'grounded_research_gate_state',
  'grounded_research_denied_gate_count',
  'grounded_research_denied_provider_count',
]);

const RATE_METRICS = new Set(CORE_METRIC_KEYS.filter((key) => key.endsWith('_rate')));

const CORE_METRIC_DEFINITIONS = Object.freeze(
  CORE_METRIC_KEYS.map((metricKey) => Object.freeze({
    metricKey,
    displayName: metricKey.replaceAll('_', ' '),
    description: `Deterministic pilot metric: ${metricKey}.`,
    version: '1',
    status: 'active',
    domain: metricKey.split('_')[0],
    unit: RATE_METRICS.has(metricKey) ? 'percentage' : metricKey.endsWith('_count') ? 'count' : 'category',
    numeratorEventKeys: [],
    denominatorEventKeys: RATE_METRICS.has(metricKey) ? ['eligible_population'] : [],
    eligiblePopulationDefinition: 'tenant_scoped_pilot_population',
    exclusionRules: ['withdrawn', 'provider_blocked_from_voluntary_abandonment'],
    windowDefinition: 'reporting_window',
    aggregationFunction: RATE_METRICS.has(metricKey) ? 'bounded_percentage' : 'bounded_count_or_category',
    minimumSampleSize: RATE_METRICS.has(metricKey) ? 5 : 1,
    missingDataBehavior: 'unknown',
    classification: 'product_usage',
  })),
);

const FUNNEL_DEFINITIONS = Object.freeze({
  onboarding: Object.freeze({
    funnelKey: 'pilot_onboarding',
    version: '1',
    orderedSteps: [
      'pilot.enrollment.approved',
      'pilot.onboarding.started',
      'pilot.roles.assigned',
      'pilot.capability_restrictions.acknowledged',
      'pilot.passport.list_viewed',
      'pilot.connection.install_completed',
      'pilot.orchestration.definition_created',
      'pilot.orchestration.run_submitted',
      'pilot.orchestration.run_completed',
      'pilot.onboarding.approved',
    ],
  }),
  activation: Object.freeze({
    funnelKey: 'pilot_activation',
    version: '1',
    orderedSteps: [
      'pilot.enrollment.approved',
      'pilot.connection.install_completed',
      'pilot.orchestration.definition_activated',
      'pilot.orchestration.run_completed',
    ],
  }),
  orchestration: Object.freeze({
    funnelKey: 'pilot_orchestration_value',
    version: '1',
    orderedSteps: [
      'pilot.orchestration.definition_created',
      'pilot.orchestration.definition_validated',
      'pilot.orchestration.definition_activated',
      'pilot.orchestration.run_submitted',
      'pilot.orchestration.run_accepted',
      'pilot.orchestration.run_started',
      'pilot.orchestration.run_completed',
      'pilot.capability.repeated_use',
      'pilot.delegation.completed',
    ],
  }),
  capability: Object.freeze({
    funnelKey: 'pilot_capability_adoption',
    version: '1',
    orderedSteps: [
      'pilot.capability.list_viewed',
      'pilot.capability.detail_viewed',
      'pilot.capability.access_requested',
      'pilot.capability.first_used',
      'pilot.capability.repeated_use',
    ],
  }),
});

const FEEDBACK_TAXONOMY = Object.freeze([
  'onboarding_confusion',
  'navigation_difficulty',
  'terminology_confusion',
  'missing_documentation',
  'capability_discovery',
  'orchestration_builder',
  'agent_connection',
  'agent_selection',
  'delegation',
  'approval_flow',
  'recovery',
  'compensation',
  'performance',
  'reliability',
  'observability',
  'provider_availability',
  'quota_friction',
  'access_control',
  'integration_request',
  'feature_request',
  'support_experience',
  'other',
]);

const SECURITY_GUARDRAILS = Object.freeze([
  'authentication_failure',
  'authorization_failure',
  'cross_tenant_finding',
  'credential_exposure',
  'data_residency_violation',
  'stale_writer_violation',
]);

module.exports = {
  ANALYTICS_CLASSIFICATIONS,
  ANALYTICS_EVENT_DEFINITIONS,
  COLLECTION_STATES,
  COMMON_PROPERTIES,
  CORE_METRIC_DEFINITIONS,
  CORE_METRIC_KEYS,
  EVENT_DEFINITION_MAP,
  FEEDBACK_TAXONOMY,
  FUNNEL_DEFINITIONS,
  SECURITY_GUARDRAILS,
};
