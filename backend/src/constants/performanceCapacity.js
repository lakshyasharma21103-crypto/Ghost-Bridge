const PERFORMANCE_TEST_MODES = Object.freeze([
  'simulation',
  'local_smoke',
  'local_load',
  'integration_load',
  'staging_load',
  'staging_stress',
  'staging_soak',
  'production_observation_only',
]);

const AUTOMATED_MODES = Object.freeze(['simulation', 'local_smoke', 'integration_load']);
const MANUAL_ONLY_MODES = Object.freeze([
  'local_load',
  'staging_load',
  'staging_stress',
  'staging_soak',
]);

const TRAFFIC_MODELS = Object.freeze([
  'closed_loop',
  'open_loop',
  'fixed_arrival',
  'stepped_arrival',
  'burst',
  'spike',
  'soak',
  'stress',
]);

const WORKLOAD_DOMAIN_IDS = Object.freeze([
  'interactive_api',
  'authentication_and_authorization',
  'agent_catalog',
  'agent_selection',
  'orchestration_submission',
  'orchestration_execution',
  'delegation',
  'recovery',
  'compensation',
  'approval_resume',
  'intervention_resolution',
  'queue_claiming',
  'database_read',
  'database_write',
  'cache_read',
  'cache_invalidation',
  'projection_rebuild',
  'observability_query',
  'slo_evaluation',
  'alert_evaluation',
  'regional_failover_simulation',
  'backup_restore_simulation',
]);

const READ_MODES = Object.freeze([
  'simulation', 'local_smoke', 'local_load', 'integration_load', 'staging_load',
  'staging_stress', 'staging_soak', 'production_observation_only',
]);
const MUTATION_MODES = Object.freeze(READ_MODES.filter((mode) => mode !== 'production_observation_only'));

function workload(input) {
  return Object.freeze({
    consistencyClass: 'strong_authority',
    defaultTimeoutMs: 5_000,
    maximumConcurrency: 50,
    maximumRequestsPerSecond: 100,
    maximumFixtureCount: 1_000,
    cleanupBehavior: 'fixture_set_scoped',
    supportedModes: MUTATION_MODES,
    expectedOutcomes: ['success'],
    responseValidatorId: 'safe_scoped_response.v1',
    ...input,
  });
}

const WORKLOAD_DOMAINS = Object.freeze({
  interactive_api: workload({ targetOperation: 'authenticated_api_read', requestGeneratorId: 'authenticated_api.v1', supportedModes: READ_MODES, expectedOutcomes: ['success', 'quota_rejection', 'overload_rejection'] }),
  authentication_and_authorization: workload({ targetOperation: 'authorization_evaluation', requestGeneratorId: 'authorization_evaluation.v1', supportedModes: READ_MODES, maximumRequestsPerSecond: 200, expectedOutcomes: ['success', 'policy_denial'] }),
  agent_catalog: workload({ targetOperation: 'agent_catalog_list', requestGeneratorId: 'agent_catalog_list.v1', supportedModes: READ_MODES, consistencyClass: 'eventual_projection' }),
  agent_selection: workload({ targetOperation: 'governed_agent_selection', requestGeneratorId: 'agent_selection.v1' }),
  orchestration_submission: workload({ targetOperation: 'orchestration_submit', requestGeneratorId: 'orchestration_submit.v1', expectedOutcomes: ['success', 'quota_rejection', 'overload_rejection', 'policy_denial'] }),
  orchestration_execution: workload({ targetOperation: 'orchestration_execute', requestGeneratorId: 'orchestration_execution.v1', defaultTimeoutMs: 30_000, maximumConcurrency: 40 }),
  delegation: workload({ targetOperation: 'delegation_execute', requestGeneratorId: 'delegation.v1', defaultTimeoutMs: 20_000 }),
  recovery: workload({ targetOperation: 'recovery_execute', requestGeneratorId: 'recovery.v1', defaultTimeoutMs: 30_000, maximumConcurrency: 25 }),
  compensation: workload({ targetOperation: 'compensation_execute', requestGeneratorId: 'compensation.v1', defaultTimeoutMs: 30_000, maximumConcurrency: 25 }),
  approval_resume: workload({ targetOperation: 'approval_resume', requestGeneratorId: 'approval_resume.v1', maximumConcurrency: 25 }),
  intervention_resolution: workload({ targetOperation: 'intervention_resolve', requestGeneratorId: 'intervention_resolution.v1', maximumConcurrency: 25 }),
  queue_claiming: workload({ targetOperation: 'atomic_queue_claim', requestGeneratorId: 'queue_claim.v1', maximumConcurrency: 100, maximumRequestsPerSecond: 250 }),
  database_read: workload({ targetOperation: 'governed_database_read', requestGeneratorId: 'database_read.v1', supportedModes: READ_MODES, maximumRequestsPerSecond: 250 }),
  database_write: workload({ targetOperation: 'governed_database_write', requestGeneratorId: 'database_write.v1', maximumRequestsPerSecond: 100 }),
  cache_read: workload({ targetOperation: 'cache_aside_read', requestGeneratorId: 'cache_read.v1', supportedModes: READ_MODES, consistencyClass: 'versioned_immutable', maximumRequestsPerSecond: 500 }),
  cache_invalidation: workload({ targetOperation: 'durable_cache_invalidation', requestGeneratorId: 'cache_invalidation.v1', consistencyClass: 'eventual_projection', maximumRequestsPerSecond: 100 }),
  projection_rebuild: workload({ targetOperation: 'bounded_projection_rebuild', requestGeneratorId: 'projection_rebuild.v1', consistencyClass: 'eventual_projection', defaultTimeoutMs: 60_000, maximumConcurrency: 10, maximumFixtureCount: 500 }),
  observability_query: workload({ targetOperation: 'observability_summary_read', requestGeneratorId: 'observability_query.v1', supportedModes: READ_MODES, consistencyClass: 'eventual_projection' }),
  slo_evaluation: workload({ targetOperation: 'test_slo_evaluation', requestGeneratorId: 'slo_evaluation.v1', supportedModes: READ_MODES, consistencyClass: 'eventual_projection' }),
  alert_evaluation: workload({ targetOperation: 'test_alert_evaluation', requestGeneratorId: 'alert_evaluation.v1', supportedModes: READ_MODES, consistencyClass: 'eventual_projection' }),
  regional_failover_simulation: workload({ targetOperation: 'local_regional_failover_simulation', requestGeneratorId: 'regional_failover_simulation.v1', defaultTimeoutMs: 120_000, maximumConcurrency: 20, maximumRequestsPerSecond: 50, maximumFixtureCount: 500 }),
  backup_restore_simulation: workload({ targetOperation: 'local_backup_restore_simulation', requestGeneratorId: 'backup_restore_simulation.v1', defaultTimeoutMs: 120_000, maximumConcurrency: 5, maximumRequestsPerSecond: 10, maximumFixtureCount: 250 }),
});

const PERFORMANCE_LIMITS = Object.freeze({
  maximumDurationMs: 86_400_000,
  automatedMaximumDurationMs: 120_000,
  smokeMaximumDurationMs: 30_000,
  maximumStageDurationMs: 21_600_000,
  maximumStages: 50,
  maximumConcurrency: 500,
  automatedMaximumConcurrency: 50,
  smokeMaximumConcurrency: 10,
  maximumRequestsPerSecond: 2_000,
  automatedMaximumRequestsPerSecond: 250,
  smokeMaximumRequestsPerSecond: 25,
  maximumTenantCount: 50,
  maximumWorkspaceCount: 250,
  maximumUserCount: 1_000,
  maximumFixtureCount: 10_000,
  automatedMaximumFixtureCount: 2_000,
  maximumRequestMixEntries: 25,
  maximumStopConditions: 25,
  maximumMeasurementWindows: 10_000,
  maximumHistogramBuckets: 32,
  maximumSafeArray: 512,
});

const RUN_STATUSES = Object.freeze([
  'requested', 'validating', 'approval_required', 'approved', 'preparing',
  'warming_up', 'running', 'cooling_down', 'analyzing', 'passed',
  'passed_with_warnings', 'failed', 'aborted', 'cancelled',
  'cleanup_required', 'cleaned_up',
]);

const RUN_TRANSITIONS = Object.freeze({
  requested: Object.freeze(['validating']),
  validating: Object.freeze(['approval_required', 'preparing', 'failed']),
  approval_required: Object.freeze(['approved', 'cancelled']),
  approved: Object.freeze(['preparing', 'cancelled']),
  preparing: Object.freeze(['warming_up', 'aborted', 'cancelled']),
  warming_up: Object.freeze(['running', 'aborted', 'cancelled']),
  running: Object.freeze(['cooling_down', 'aborted', 'cancelled']),
  cooling_down: Object.freeze(['analyzing', 'aborted']),
  analyzing: Object.freeze(['passed', 'passed_with_warnings', 'failed', 'aborted']),
  passed: Object.freeze(['cleanup_required']),
  passed_with_warnings: Object.freeze(['cleanup_required']),
  failed: Object.freeze(['cleanup_required']),
  aborted: Object.freeze(['cleanup_required']),
  cancelled: Object.freeze(['cleanup_required']),
  cleanup_required: Object.freeze(['cleaned_up']),
  cleaned_up: Object.freeze([]),
});

const PERFORMANCE_TARGETS = Object.freeze([
  Object.freeze({
    targetId: 'local-in-process-v1', category: 'local_in_process', safeDisplayName: 'Local in-process simulation',
    allowedModes: ['simulation', 'local_smoke', 'local_load', 'integration_load'], maximumConcurrency: 100,
    maximumRequestRate: 500, maximumDurationMs: 3_600_000, allowedWorkloadDomains: WORKLOAD_DOMAIN_IDS,
    requiresApproval: false, requiresManualExecution: false, residencyTags: ['synthetic-local'], enabled: true,
  }),
  Object.freeze({
    targetId: 'local-http-v1', category: 'local_http', safeDisplayName: 'Authenticated local HTTP stack',
    allowedModes: ['local_smoke', 'local_load', 'integration_load'], maximumConcurrency: 100,
    maximumRequestRate: 500, maximumDurationMs: 3_600_000, allowedWorkloadDomains: WORKLOAD_DOMAIN_IDS,
    requiresApproval: false, requiresManualExecution: true, residencyTags: ['synthetic-local'], enabled: true,
  }),
  Object.freeze({
    targetId: 'integration-http-v1', category: 'integration_http', safeDisplayName: 'Allowlisted integration stack',
    allowedModes: ['integration_load'], maximumConcurrency: 100, maximumRequestRate: 500,
    maximumDurationMs: 3_600_000, allowedWorkloadDomains: WORKLOAD_DOMAIN_IDS,
    requiresApproval: false, requiresManualExecution: true, residencyTags: ['synthetic-integration'], enabled: true,
  }),
  Object.freeze({
    targetId: 'staging-http-v1', category: 'staging_http', safeDisplayName: 'Allowlisted staging stack',
    allowedModes: ['staging_load', 'staging_stress', 'staging_soak'], maximumConcurrency: 500,
    maximumRequestRate: 2_000, maximumDurationMs: 86_400_000, allowedWorkloadDomains: WORKLOAD_DOMAIN_IDS,
    requiresApproval: true, requiresManualExecution: true, residencyTags: ['configured-staging'], enabled: false,
  }),
  Object.freeze({
    targetId: 'production-observation-v1', category: 'production_metrics_only', safeDisplayName: 'Production metrics observation',
    allowedModes: ['production_observation_only'], maximumConcurrency: 0, maximumRequestRate: 0,
    maximumDurationMs: 86_400_000, allowedWorkloadDomains: WORKLOAD_DOMAIN_IDS,
    requiresApproval: false, requiresManualExecution: true, residencyTags: ['production-observation'], enabled: true,
  }),
]);

const HISTOGRAM_BUCKETS_MS = Object.freeze([
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000,
  10_000, 20_000, 30_000, 60_000, 120_000, 300_000, 600_000,
]);

const OUTCOME_CATEGORIES = Object.freeze([
  'success', 'expected_rejection', 'overload_rejection', 'quota_rejection',
  'timeout', 'retry', 'cancelled', 'unknown_outcome', 'internal_failure',
  'correctness_failure', 'security_failure',
]);

const EVALUATION_STATES = Object.freeze([
  'passed', 'passed_with_warnings', 'failed', 'insufficient_data',
  'incompatible_environment', 'aborted',
]);

const REGRESSION_STATES = Object.freeze([
  'improved', 'unchanged', 'warning', 'regressed', 'incompatible', 'insufficient_data',
]);

const HEADROOM_CATEGORIES = Object.freeze(['ample', 'adequate', 'limited', 'critical', 'unknown']);

const AUTOSCALING_RECOMMENDATIONS = Object.freeze([
  'scale_up_execution_workers', 'scale_down_execution_workers',
  'scale_up_recovery_workers', 'scale_up_control_plane_workers',
  'increase_partition_count', 'reduce_claim_batch_size',
  'increase_reserved_recovery_capacity', 'investigate_database_pressure',
  'investigate_cache_contention', 'hold', 'insufficient_data',
]);

module.exports = {
  AUTOMATED_MODES,
  AUTOSCALING_RECOMMENDATIONS,
  EVALUATION_STATES,
  HEADROOM_CATEGORIES,
  HISTOGRAM_BUCKETS_MS,
  MANUAL_ONLY_MODES,
  OUTCOME_CATEGORIES,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TARGETS,
  PERFORMANCE_TEST_MODES,
  REGRESSION_STATES,
  RUN_STATUSES,
  RUN_TRANSITIONS,
  TRAFFIC_MODELS,
  WORKLOAD_DOMAINS,
  WORKLOAD_DOMAIN_IDS,
};
