const ENVIRONMENT_CATEGORIES = Object.freeze([
  'development',
  'test',
  'ci',
  'integration',
  'staging',
  'production',
]);

const RELEASE_CANDIDATE_STATUSES = Object.freeze([
  'draft',
  'validating',
  'validation_failed',
  'ready_for_approval',
  'approval_required',
  'approved',
  'rejected',
  'superseded',
  'released',
  'archived',
]);

const ROLLOUT_STATUSES = Object.freeze([
  'draft',
  'validating',
  'blocked',
  'approval_required',
  'approved',
  'preparing',
  'migrating',
  'deploying_canary',
  'observing_canary',
  'expanding',
  'verifying',
  'succeeded',
  'paused',
  'failed',
  'aborting',
  'rollback_required',
  'rolling_back',
  'rolled_back',
  'roll_forward_required',
  'cancelled',
]);

const ROLLOUT_TRANSITIONS = Object.freeze({
  draft: ['validating', 'cancelled'],
  validating: ['blocked', 'approval_required', 'approved', 'cancelled'],
  blocked: ['validating', 'cancelled'],
  approval_required: ['approved', 'cancelled'],
  approved: ['preparing', 'expanding', 'verifying', 'cancelled'],
  preparing: ['migrating', 'deploying_canary', 'failed', 'cancelled'],
  migrating: ['deploying_canary', 'failed', 'roll_forward_required'],
  deploying_canary: ['observing_canary', 'paused', 'failed'],
  observing_canary: ['expanding', 'paused', 'rollback_required'],
  expanding: ['verifying', 'paused', 'rollback_required'],
  verifying: ['succeeded', 'rollback_required', 'roll_forward_required'],
  paused: ['deploying_canary', 'observing_canary', 'expanding', 'aborting', 'rollback_required'],
  aborting: ['cancelled', 'rollback_required', 'failed'],
  rollback_required: ['rolling_back', 'roll_forward_required'],
  rolling_back: ['rolled_back', 'failed'],
  roll_forward_required: ['approved'],
  failed: ['rollback_required', 'roll_forward_required'],
});

const RELEASE_STRATEGIES = Object.freeze([
  'all_at_once',
  'rolling',
  'canary',
  'blue_green',
  'regional_sequential',
  'manual',
]);

const PREFLIGHT_STATES = Object.freeze([
  'passed',
  'passed_with_warnings',
  'blocked',
  'insufficient_evidence',
  'approval_required',
]);

const MANUAL_GATE_RESULTS = Object.freeze([
  'not_run',
  'passed',
  'failed',
  'failed_transient',
  'failed_configuration',
  'failed_authentication',
  'blocked_provider_unavailable',
  'waived',
  'waived_with_approval',
  'expired',
]);

const NON_WAIVABLE_FINDINGS = Object.freeze([
  'AUTHENTICATION_BYPASS',
  'CREDENTIAL_EXPOSURE',
  'ENCRYPTION_BYPASS',
  'SPLIT_BRAIN_RISK',
  'STALE_WRITER_FENCING_BYPASS',
  'TENANT_ISOLATION_FAILURE',
  'DATA_RESIDENCY_VIOLATION',
]);

const RUNBOOK_MANIFEST = Object.freeze([
  ['normal-deployment', 'RELEASE_READINESS.md#normal-deployment'],
  ['canary-rollout', 'RELEASE_READINESS.md#canary-rollout'],
  ['rollout-pause', 'RELEASE_READINESS.md#rollout-pause'],
  ['rollback', 'RELEASE_READINESS.md#rollback-and-roll-forward'],
  ['roll-forward', 'RELEASE_READINESS.md#rollback-and-roll-forward'],
  ['database-migration-failure', 'RELEASE_READINESS.md#database-migrations'],
  ['queue-backlog', 'OPERATIONS.md'],
  ['worker-fencing-failure', 'PRODUCTION_SCALE.md'],
  ['cache-outage', 'DATA_ACCESS_PERFORMANCE.md'],
  ['database-outage', 'OPERATIONS.md'],
  ['runtime-gateway-outage', 'RUNTIME_RELIABILITY.md'],
  ['gemini-503-outage', 'RELEASE_READINESS.md#manual-gates'],
  ['credential-rotation', 'SECRET_GOVERNANCE.md'],
  ['suspected-credential-leak', 'RELEASE_READINESS.md#tracked-secret-remediation'],
  ['regional-failover', 'MULTI_REGION_RESILIENCE.md'],
  ['regional-failback', 'MULTI_REGION_RESILIENCE.md'],
  ['backup-verification-failure', 'MULTI_REGION_RESILIENCE.md'],
  ['isolated-restore', 'MULTI_REGION_RESILIENCE.md'],
  ['slo-breach', 'ORCHESTRATION_OBSERVABILITY.md'],
  ['performance-regression', 'PERFORMANCE_CAPACITY.md'],
  ['stuck-orchestration', 'ORCHESTRATION_RECOVERY.md'],
  ['compensation-failure', 'ORCHESTRATION_RECOVERY.md'],
  ['release-cleanup', 'RELEASE_READINESS.md#old-version-decommissioning'],
].map(([key, documentationPath]) => Object.freeze({ key, documentationPath, version: 1 })));

module.exports = {
  ENVIRONMENT_CATEGORIES,
  MANUAL_GATE_RESULTS,
  NON_WAIVABLE_FINDINGS,
  PREFLIGHT_STATES,
  RELEASE_CANDIDATE_STATUSES,
  RELEASE_STRATEGIES,
  ROLLOUT_STATUSES,
  ROLLOUT_TRANSITIONS,
  RUNBOOK_MANIFEST,
};
