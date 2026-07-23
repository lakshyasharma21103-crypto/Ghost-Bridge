const REGIONAL_SCOPES = Object.freeze(['platform', 'organization', 'workspace']);
const VERSION_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const REGIONAL_ROLES = Object.freeze([
  'primary',
  'warm_standby',
  'cold_standby',
  'read_only',
  'isolated',
  'disabled',
]);
const REGIONAL_STATES = Object.freeze([
  'initializing',
  'healthy',
  'degraded',
  'unavailable',
  'isolated',
  'draining',
  'maintenance',
  'failover_candidate',
  'promoted',
  'demoted',
  'recovery_required',
  'disabled',
]);
const SERVICE_TYPES = Object.freeze([
  'backend',
  'execution_worker',
  'recovery_worker',
  'control_plane_worker',
  'projection_worker',
  'scheduler',
]);
const SERVICE_STATES = Object.freeze([
  'starting', 'active', 'idle', 'draining', 'degraded', 'isolated', 'unhealthy', 'stopped',
]);
const HEALTH_STATUSES = Object.freeze(['healthy', 'elevated', 'degraded', 'unavailable', 'isolated', 'unknown']);
const HEALTH_CATEGORIES = Object.freeze(['healthy', 'elevated', 'degraded', 'unavailable', 'unknown']);
const AUTHORITY_STATUSES = Object.freeze(['active', 'transferring', 'frozen', 'isolated', 'recovery_required']);
const ROUTING_OUTCOMES = Object.freeze([
  'route_primary',
  'route_home_region',
  'route_read_replica',
  'route_standby_read_only',
  'reject_residency',
  'reject_region_unavailable',
  'reject_write_fenced',
  'queue_for_primary',
  'degraded_read_only',
]);
const REPLICATION_DOMAINS = Object.freeze(['authority', 'operational', 'projection', 'cache', 'backup']);
const REPLICATION_STATUSES = Object.freeze(['healthy', 'elevated', 'delayed', 'unavailable', 'unknown']);
const LAG_CATEGORIES = Object.freeze(['none', 'low', 'moderate', 'high', 'critical', 'unknown']);
const OBJECTIVE_STATUSES = Object.freeze(['compliant', 'at_risk', 'breached', 'unknown', 'insufficient_data']);
const CRITICALITIES = Object.freeze(['standard', 'important', 'critical']);
const DEGRADED_MODES = Object.freeze(['disabled', 'read_only', 'queue_only', 'restricted_operations']);
const FAILOVER_TYPES = Object.freeze(['planned_switchover', 'emergency_failover', 'disaster_recovery', 'test_drill']);
const FAILOVER_TRIGGERS = Object.freeze(['operator', 'health_failure', 'database_failure', 'regional_outage', 'security_incident', 'scheduled_drill']);
const FAILOVER_STATES = Object.freeze([
  'requested', 'validating', 'approval_required', 'approved', 'freezing_admission',
  'draining_source', 'verifying_replication', 'fencing_source', 'transferring_authority',
  'transferring_queues', 'activating_target', 'rebuilding_projections', 'validating_target',
  'succeeded', 'partial', 'failed', 'paused', 'cancelled', 'rollback_required',
]);
const FAILOVER_TRANSITIONS = Object.freeze({
  requested: ['validating', 'cancelled', 'failed'],
  validating: ['approval_required', 'approved', 'failed', 'paused'],
  approval_required: ['approved', 'cancelled', 'failed'],
  approved: ['freezing_admission', 'cancelled', 'paused', 'failed'],
  freezing_admission: ['draining_source', 'verifying_replication', 'paused', 'failed'],
  draining_source: ['verifying_replication', 'paused', 'failed'],
  verifying_replication: ['fencing_source', 'approval_required', 'paused', 'failed'],
  fencing_source: ['transferring_authority', 'paused', 'failed', 'rollback_required'],
  transferring_authority: ['transferring_queues', 'partial', 'failed', 'rollback_required'],
  transferring_queues: ['activating_target', 'partial', 'failed', 'rollback_required'],
  activating_target: ['rebuilding_projections', 'validating_target', 'partial', 'failed'],
  rebuilding_projections: ['validating_target', 'partial', 'failed'],
  validating_target: ['succeeded', 'partial', 'failed'],
  paused: ['validating', 'approved', 'freezing_admission', 'draining_source', 'verifying_replication', 'fencing_source', 'cancelled', 'failed'],
  partial: ['rollback_required'],
  succeeded: [], failed: [], cancelled: [], rollback_required: [],
});

const PLANNED_SWITCHOVER_STEPS = Object.freeze([
  'validate_configuration', 'require_approval', 'freeze_admission', 'drain_source',
  'wait_safe_claim_boundary', 'verify_replication', 'verify_target_readiness',
  'freeze_source_authority', 'transfer_authority', 'transfer_queues',
  'invalidate_caches', 'activate_target_workers', 'resume_recovery', 'resume_admission',
  'rebuild_projections', 'verify_health', 'update_incident',
]);
const EMERGENCY_FAILOVER_STEPS = Object.freeze([
  'validate_configuration', 'link_incident', 'require_approval', 'freeze_admission',
  'verify_replication', 'accept_potential_data_loss', 'fence_source', 'transfer_authority',
  'transfer_queues', 'invalidate_caches', 'activate_target_workers', 'resume_recovery',
  'rebuild_projections', 'verify_health', 'resume_admission',
]);
const BACKUP_TYPES = Object.freeze(['snapshot', 'incremental', 'logical_export', 'point_in_time_reference']);
const BACKUP_STATUSES = Object.freeze(['requested', 'running', 'completed', 'failed', 'expired', 'deleted', 'verification_required', 'verified']);
const RESTORE_MODES = Object.freeze(['isolated_validation', 'disaster_recovery', 'test_drill']);
const RESTORE_STATES = Object.freeze([
  'requested', 'approval_required', 'approved', 'provisioning_target', 'restoring',
  'validating_schema', 'validating_indexes', 'validating_integrity', 'rebuilding_projections',
  'ready_for_promotion', 'promoted', 'failed', 'cancelled', 'cleaned_up',
]);
const RESTORE_TRANSITIONS = Object.freeze({
  requested: ['approval_required', 'approved', 'cancelled', 'failed'],
  approval_required: ['approved', 'cancelled', 'failed'],
  approved: ['provisioning_target', 'cancelled', 'failed'],
  provisioning_target: ['restoring', 'cancelled', 'failed'],
  restoring: ['validating_schema', 'failed', 'cancelled'],
  validating_schema: ['validating_indexes', 'failed'],
  validating_indexes: ['validating_integrity', 'failed'],
  validating_integrity: ['rebuilding_projections', 'ready_for_promotion', 'failed'],
  rebuilding_projections: ['ready_for_promotion', 'failed'],
  ready_for_promotion: ['promoted', 'cleaned_up', 'failed'],
  promoted: [], failed: ['cleaned_up'], cancelled: ['cleaned_up'], cleaned_up: [],
});
const DRILL_TYPES = Object.freeze(['control_plane_simulation', 'worker_region_loss', 'primary_region_loss', 'backup_restore_validation', 'failover_and_failback']);
const DRILL_STATUSES = Object.freeze(['draft', 'scheduled', 'running', 'succeeded', 'partial', 'failed', 'cancelled']);

const REGIONAL_LIMITS = Object.freeze({
  maximumRegions: 16,
  maximumRegionPriority: 1_000,
  maximumPageSize: 100,
  maximumSafeReasons: 16,
  maximumSafeListEntries: 32,
  maximumDurationMs: 365 * 24 * 60 * 60 * 1_000,
  minimumLeaseMs: 5_000,
  maximumLeaseMs: 3_600_000,
  maximumAuthorityEpoch: Number.MAX_SAFE_INTEGER,
});

module.exports = {
  AUTHORITY_STATUSES,
  BACKUP_STATUSES,
  BACKUP_TYPES,
  CRITICALITIES,
  DEGRADED_MODES,
  DRILL_STATUSES,
  DRILL_TYPES,
  EMERGENCY_FAILOVER_STEPS,
  FAILOVER_STATES,
  FAILOVER_TRANSITIONS,
  FAILOVER_TRIGGERS,
  FAILOVER_TYPES,
  HEALTH_CATEGORIES,
  HEALTH_STATUSES,
  LAG_CATEGORIES,
  OBJECTIVE_STATUSES,
  PLANNED_SWITCHOVER_STEPS,
  REGIONAL_LIMITS,
  REGIONAL_ROLES,
  REGIONAL_SCOPES,
  REGIONAL_STATES,
  REPLICATION_DOMAINS,
  REPLICATION_STATUSES,
  RESTORE_MODES,
  RESTORE_STATES,
  RESTORE_TRANSITIONS,
  ROUTING_OUTCOMES,
  SERVICE_STATES,
  SERVICE_TYPES,
  VERSION_STATUSES,
};
