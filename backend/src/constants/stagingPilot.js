const STAGING_DEPLOYMENT_STATUSES = Object.freeze([
  'draft', 'validation_required', 'validating', 'blocked', 'approval_required', 'approved',
  'deployment_requested', 'deployment_in_progress', 'deployed', 'verification_in_progress',
  'healthy', 'healthy_with_warnings', 'degraded', 'rollback_required', 'rolled_back',
  'failed', 'cancelled', 'archived',
]);

const STAGING_DEPLOYMENT_TRANSITIONS = Object.freeze({
  draft: ['validation_required', 'validating', 'cancelled'],
  validation_required: ['validating', 'cancelled'],
  validating: ['blocked', 'approval_required'],
  blocked: ['validating', 'cancelled', 'archived'],
  approval_required: ['approved', 'blocked', 'cancelled'],
  approved: ['deployment_requested', 'cancelled'],
  deployment_requested: ['deployment_in_progress', 'deployed', 'failed', 'cancelled'],
  deployment_in_progress: ['deployed', 'failed', 'rollback_required'],
  deployed: ['verification_in_progress', 'rollback_required'],
  verification_in_progress: ['healthy', 'healthy_with_warnings', 'degraded', 'rollback_required', 'failed'],
  healthy: ['degraded', 'rollback_required', 'archived'],
  healthy_with_warnings: ['healthy', 'degraded', 'rollback_required', 'archived'],
  degraded: ['verification_in_progress', 'rollback_required', 'failed'],
  rollback_required: ['rolled_back', 'failed'],
  rolled_back: ['archived'],
  failed: ['rollback_required', 'archived'],
  cancelled: ['archived'],
  archived: [],
});

const SMOKE_TEST_KEYS = Object.freeze([
  'liveness', 'readiness', 'detailed_authorized_health', 'authentication_success',
  'authentication_denial', 'rbac_denial', 'tenant_isolation', 'workspace_isolation',
  'agent_passport_list', 'agent_connection_safe_metadata', 'orchestration_definition_list',
  'synthetic_orchestration_submission', 'queue_execution_mock_agent', 'cancellation',
  'checkpoint_creation', 'recovery', 'compensation', 'timeline_read', 'trace_read',
  'alert_creation', 'incident_linkage', 'cache_miss_hit', 'cache_invalidation',
  'projection_update', 'worker_drain', 'stale_worker_fencing', 'regional_write_authority_read',
  'feature_flag_evaluation', 'pilot_capability_denial', 'support_bundle_redaction',
]);

const CAPABILITY_KEYS = Object.freeze([
  'core.authentication', 'core.rbac', 'core.audit', 'core.agent_passports',
  'core.agent_connections', 'orchestration.basic', 'orchestration.parallel',
  'orchestration.delegation', 'orchestration.recovery', 'orchestration.compensation',
  'orchestration.approvals', 'operations.alerts', 'operations.incidents',
  'operations.support_bundle', 'external.grounded_research', 'regional.failover_controls',
  'backup.restore_controls', 'performance.manual_tests',
]);

const SAFETY_CAPABILITIES = Object.freeze([
  'core.authentication', 'core.rbac', 'core.audit', 'orchestration.recovery',
  'orchestration.compensation', 'operations.incidents',
]);

const KILL_SWITCH_KEYS = Object.freeze([
  'disable_new_orchestration_submissions', 'disable_external_agent_invocations',
  'disable_grounded_research', 'disable_new_delegations', 'disable_noncritical_projections',
  'force_read_only_pilot_ui', 'pause_pilot_enrollment',
]);

const PILOT_ADMISSION_OUTCOMES = Object.freeze([
  'accepted', 'accepted_deferred', 'approval_required', 'rejected_not_enrolled',
  'rejected_capability_disabled', 'rejected_gate_blocked', 'rejected_pilot_quota',
  'rejected_platform_quota', 'rejected_residency', 'rejected_classification',
  'rejected_operational_state', 'rejected_provider_unavailable',
]);

const PILOT_RUNBOOKS = Object.freeze([
  'staging-deployment', 'staging-rollback', 'smoke-test-cleanup', 'pilot-onboarding',
  'pilot-incident-response', 'provider-outage', 'pilot-pause-resume', 'pilot-graduation',
]);

module.exports = {
  CAPABILITY_KEYS,
  KILL_SWITCH_KEYS,
  PILOT_ADMISSION_OUTCOMES,
  PILOT_RUNBOOKS,
  SAFETY_CAPABILITIES,
  SMOKE_TEST_KEYS,
  STAGING_DEPLOYMENT_STATUSES,
  STAGING_DEPLOYMENT_TRANSITIONS,
};
