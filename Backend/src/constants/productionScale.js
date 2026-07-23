const WORKER_POOLS = Object.freeze([
  'execution',
  'recovery',
  'control_plane',
  'evaluation',
  'maintenance',
]);

const PRIORITY_CLASSES = Object.freeze([
  'critical_recovery',
  'high',
  'standard',
  'low',
  'maintenance',
]);

const PRIORITY_RANK = Object.freeze({
  critical_recovery: 5,
  high: 4,
  standard: 3,
  low: 2,
  maintenance: 1,
});

const ADMISSION_CLASSES = Object.freeze(['protected', 'interactive', 'standard', 'deferred', 'optional']);
const ADMISSION_DECISIONS = Object.freeze([
  'accepted',
  'accepted_primary',
  'accepted_deferred',
  'accepted_degraded',
  'rejected_capacity',
  'rejected_quota',
  'rejected_operational_state',
  'rejected_region_unavailable',
  'rejected_residency',
  'rejected_failover_in_progress',
  'rejected_no_write_authority',
  'rejected_not_enrolled',
  'rejected_capability_disabled',
  'rejected_gate_blocked',
  'rejected_pilot_quota',
  'rejected_platform_quota',
  'rejected_classification',
  'rejected_provider_unavailable',
  'approval_required',
]);
const BACKPRESSURE_STATES = Object.freeze(['normal', 'elevated', 'saturated', 'shedding', 'paused']);
const DATABASE_PRESSURE_CATEGORIES = Object.freeze(['healthy', 'elevated', 'degraded', 'unavailable']);
const AUTOSCALING_RECOMMENDATIONS = Object.freeze(['scale_up', 'scale_down', 'hold', 'investigate']);

const WORKLOAD_DEFINITIONS = Object.freeze({
  orchestration_node: Object.freeze({
    workerPool: 'execution', defaultPriority: 'standard', maximumAttempts: 5,
    leaseDurationMs: 120_000, heartbeatIntervalMs: 30_000, claimBatchSize: 5,
    minimumConcurrency: 1, maximumConcurrency: 50, queueAgeThresholdMs: 60_000,
    deadLetterBehavior: 'review', overloadBehavior: 'defer', partitionCount: 8,
  }),
  orchestration_retry: Object.freeze({
    workerPool: 'execution', defaultPriority: 'standard', maximumAttempts: 5,
    leaseDurationMs: 120_000, heartbeatIntervalMs: 30_000, claimBatchSize: 4,
    minimumConcurrency: 1, maximumConcurrency: 40, queueAgeThresholdMs: 60_000,
    deadLetterBehavior: 'intervention', overloadBehavior: 'defer', partitionCount: 8,
  }),
  orchestration_recovery: Object.freeze({
    workerPool: 'recovery', defaultPriority: 'critical_recovery', maximumAttempts: 20,
    leaseDurationMs: 180_000, heartbeatIntervalMs: 30_000, claimBatchSize: 3,
    minimumConcurrency: 1, maximumConcurrency: 30, queueAgeThresholdMs: 30_000,
    deadLetterBehavior: 'intervention', overloadBehavior: 'protected', partitionCount: 4,
  }),
  orchestration_compensation: Object.freeze({
    workerPool: 'recovery', defaultPriority: 'critical_recovery', maximumAttempts: 10,
    leaseDurationMs: 180_000, heartbeatIntervalMs: 30_000, claimBatchSize: 2,
    minimumConcurrency: 1, maximumConcurrency: 20, queueAgeThresholdMs: 30_000,
    deadLetterBehavior: 'intervention', overloadBehavior: 'protected', partitionCount: 4,
  }),
  intervention_expiry: Object.freeze({
    workerPool: 'recovery', defaultPriority: 'high', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 10,
    minimumConcurrency: 1, maximumConcurrency: 20, queueAgeThresholdMs: 30_000,
    deadLetterBehavior: 'review', overloadBehavior: 'protected', partitionCount: 4,
  }),
  approval_resume: Object.freeze({
    workerPool: 'recovery', defaultPriority: 'high', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 10,
    minimumConcurrency: 1, maximumConcurrency: 20, queueAgeThresholdMs: 30_000,
    deadLetterBehavior: 'review', overloadBehavior: 'protected', partitionCount: 4,
  }),
  checkpoint: Object.freeze({
    workerPool: 'recovery', defaultPriority: 'high', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 5,
    minimumConcurrency: 1, maximumConcurrency: 20, queueAgeThresholdMs: 60_000,
    deadLetterBehavior: 'review', overloadBehavior: 'defer', partitionCount: 4,
  }),
  timeline_projection: Object.freeze({
    workerPool: 'control_plane', defaultPriority: 'low', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 20,
    minimumConcurrency: 0, maximumConcurrency: 20, queueAgeThresholdMs: 300_000,
    deadLetterBehavior: 'archive', overloadBehavior: 'defer', partitionCount: 4,
  }),
  trace_projection: Object.freeze({
    workerPool: 'control_plane', defaultPriority: 'low', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 20,
    minimumConcurrency: 0, maximumConcurrency: 20, queueAgeThresholdMs: 300_000,
    deadLetterBehavior: 'archive', overloadBehavior: 'defer', partitionCount: 4,
  }),
  slo_evaluation: Object.freeze({
    workerPool: 'evaluation', defaultPriority: 'low', maximumAttempts: 3,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 10,
    minimumConcurrency: 0, maximumConcurrency: 10, queueAgeThresholdMs: 300_000,
    deadLetterBehavior: 'review', overloadBehavior: 'defer', partitionCount: 2,
  }),
  alert_evaluation: Object.freeze({
    workerPool: 'evaluation', defaultPriority: 'high', maximumAttempts: 5,
    leaseDurationMs: 60_000, heartbeatIntervalMs: 15_000, claimBatchSize: 10,
    minimumConcurrency: 1, maximumConcurrency: 20, queueAgeThresholdMs: 60_000,
    deadLetterBehavior: 'review', overloadBehavior: 'protected', partitionCount: 2,
  }),
  retention_cleanup: Object.freeze({
    workerPool: 'maintenance', defaultPriority: 'maintenance', maximumAttempts: 3,
    leaseDurationMs: 300_000, heartbeatIntervalMs: 60_000, claimBatchSize: 5,
    minimumConcurrency: 0, maximumConcurrency: 5, queueAgeThresholdMs: 900_000,
    deadLetterBehavior: 'archive', overloadBehavior: 'reject', partitionCount: 2,
  }),
});

const WORKLOAD_CATEGORIES = Object.freeze(Object.keys(WORKLOAD_DEFINITIONS));

const PRODUCTION_SCALE_LIMITS = Object.freeze({
  maximumPartitionsPerCategory: 256,
  maximumRoutingVersions: 8,
  maximumWorkerConcurrency: 1_000,
  maximumClaimBatchSize: 100,
  maximumTenantWeight: 100,
  maximumQuota: 1_000_000,
  maximumQueueBytes: 10_000_000_000,
  maximumPayloadBytes: 10_000_000,
  maximumReservedSlots: 1_000,
  maximumPageSize: 100,
  maximumSafeReasonCodes: 16,
  maximumSafeString: 200,
  priorityAgingIntervalMs: 60_000,
  maximumPriorityAgeBoost: 3,
});

const DEFAULT_BACKPRESSURE_THRESHOLDS = Object.freeze({
  elevatedQueueDepth: 100,
  saturatedQueueDepth: 500,
  sheddingQueueDepth: 1_000,
  elevatedOldestAgeMs: 60_000,
  saturatedOldestAgeMs: 300_000,
  sheddingOldestAgeMs: 900_000,
  elevatedUtilizationBasisPoints: 7_500,
  saturatedUtilizationBasisPoints: 9_000,
  sheddingUtilizationBasisPoints: 9_800,
  elevatedLeaseExpiryRateBasisPoints: 500,
  saturatedLeaseExpiryRateBasisPoints: 1_500,
  sheddingLeaseExpiryRateBasisPoints: 3_000,
});

const DEFAULT_QUOTA_POLICY = Object.freeze({
  maximumQueuedRuns: 1_000,
  maximumActiveRuns: 200,
  maximumQueuedNodes: 10_000,
  maximumActiveNodes: 1_000,
  maximumConcurrentInvocations: 500,
  maximumConcurrentCompensations: 50,
  maximumConcurrentRecoveries: 100,
  maximumQueueBytesEstimate: 1_000_000_000,
  maximumPayloadBytesPerJob: 1_000_000,
  maximumRunsPerMinute: 600,
  maximumInvocationsPerMinute: 3_000,
  maximumRetriesPerMinute: 1_000,
  tenantWeight: 1,
  workspaceWeight: 1,
  burstCapacity: 20,
  burstWindowMs: 60_000,
  overloadBehavior: 'reject',
});

module.exports = {
  ADMISSION_CLASSES,
  ADMISSION_DECISIONS,
  AUTOSCALING_RECOMMENDATIONS,
  BACKPRESSURE_STATES,
  DATABASE_PRESSURE_CATEGORIES,
  DEFAULT_BACKPRESSURE_THRESHOLDS,
  DEFAULT_QUOTA_POLICY,
  PRIORITY_CLASSES,
  PRIORITY_RANK,
  PRODUCTION_SCALE_LIMITS,
  WORKER_POOLS,
  WORKLOAD_CATEGORIES,
  WORKLOAD_DEFINITIONS,
};
