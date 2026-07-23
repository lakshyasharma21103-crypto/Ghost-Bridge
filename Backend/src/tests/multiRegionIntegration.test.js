const assert = require('node:assert/strict');
const test = require('node:test');
const { DeterministicMultiRegionHarness } = require('../services/regionalResilienceHarness.service');
const core = require('../services/regionalResilienceCore.service');

function configuration() {
  return {
    name: 'Deterministic two region deployment', version: 1,
    regions: [
      { regionId: 'india-primary', regionGroup: 'india', role: 'primary', state: 'healthy', priority: 1, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential', 'restricted'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
      { regionId: 'india-standby', regionGroup: 'india', role: 'warm_standby', state: 'healthy', priority: 2, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
    ],
    preferredPrimaryRegionId: 'india-primary', defaultStandbyRegionId: 'india-standby',
    permittedFailoverRegionIds: ['india-primary', 'india-standby'], prohibitedFailoverRegionIds: [],
    maximumReplicationLagForPromotionMs: 30_000, maximumDataLossWindowMs: 60_000,
    regionalHealthTimeoutMs: 120_000, regionalHeartbeatIntervalMs: 30_000,
    authorityLeaseDurationMs: 60_000, authorityHeartbeatIntervalMs: 15_000,
    failoverApprovalPolicy: 'always', failbackApprovalPolicy: 'always', degradedModePolicy: 'read_only',
    cacheIsolationMode: 'region_local', projectionRecoveryPolicy: 'catch_up',
  };
}

function policy() {
  return {
    name: 'Critical deterministic DR', version: 1, criticality: 'critical',
    recoveryPointObjectiveMs: 30_000, recoveryTimeObjectiveMs: 300_000,
    maximumPromotionReplicationLagMs: 10_000, maximumUnknownReplicationWindowMs: 0,
    maximumDegradedModeDurationMs: 3_600_000, preferredRecoveryRegionId: 'india-standby',
    permittedRecoveryRegionIds: ['india-primary', 'india-standby'], prohibitedRecoveryRegionIds: [],
    automaticFailoverAllowed: false, requireApprovalForFailover: true, requireApprovalForFailback: true,
    requireApprovalForDataLossAcceptance: true, backupRequired: true, backupFrequencyMs: 86_400_000,
    backupRetentionMs: 2_592_000_000, restoreVerificationFrequencyMs: 604_800_000,
    minimumHealthyServiceCount: 1, minimumHealthyWorkerCount: 1,
    minimumHealthyDatabaseCategory: 'healthy', degradedMode: 'read_only',
    protectedOperationCategories: ['recovery', 'compensation', 'cancellation'],
  };
}

function setup() {
  const harness = new DeterministicMultiRegionHarness();
  harness.activateConfiguration(configuration());
  harness.activatePolicy(policy());
  for (const regionId of ['india-primary', 'india-standby']) {
    const suffix = regionId === 'india-primary' ? 'a' : 'b';
    harness.registerService({ serviceId: `backend-${suffix}`, instanceId: `backend-instance-${suffix}`, regionId, serviceType: 'backend', state: 'active', maximumConcurrency: 10 });
    harness.registerService({ serviceId: `worker-${suffix}`, instanceId: `worker-instance-${suffix}`, regionId, serviceType: 'execution_worker', state: regionId === 'india-primary' ? 'active' : 'idle', maximumConcurrency: 5, supportedWorkloadCategories: ['orchestration_node'], supportedRoutingVersions: [1], supportedRegionalOwnershipEpochs: [1, 2, 3] });
  }
  const authority = harness.acquireAuthority({ authorityKey: 'workspace:test', regionId: 'india-primary', serviceId: 'backend-a' });
  harness.ensurePartition({ partitionKey: 'orchestration_node:v1:p0', workloadCategory: 'orchestration_node', routingVersion: 1, homeRegionId: 'india-primary', activeRegionId: 'india-primary', fallbackRegionIds: ['india-standby'] });
  return { harness, authority };
}

test('two regions maintain one renewable writer and fence standby and expired leases', () => {
  const { harness, authority } = setup();
  assert.equal(harness.assertWrite({ regionId: 'india-primary', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch }), true);
  assert.throws(() => harness.assertWrite({ regionId: 'india-standby', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch }), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');
  harness.advance(20_000);
  const renewed = harness.renewAuthority({ regionId: 'india-primary', serviceId: 'backend-a', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch });
  assert.ok(new Date(renewed.leaseExpiresAt) > new Date(authority.leaseExpiresAt));
  harness.advance(60_001);
  assert.throws(() => harness.assertWrite({ regionId: 'india-primary', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch }), (error) => error.code === 'REGION_AUTHORITY_LEASE_EXPIRED');
  assert.equal(harness.authorityHistory.length, 1);
});

test('planned switchover transfers authority and queues idempotently and fences the previous owner', () => {
  const { harness } = setup();
  harness.setReplication('india-primary', 'india-standby', { lagMs: 1_000, sequenceVerified: true });
  const plan = harness.createFailoverPlan({ idempotencyKey: 'planned-a-b', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'planned_switchover', triggerType: 'operator', approved: true, sourceFencePossible: true });
  assert.equal(harness.createFailoverPlan({ idempotencyKey: 'planned-a-b', sourceRegionId: 'india-primary', targetRegionId: 'india-standby' }).planId, plan.planId);
  const result = harness.executeFailover(plan.planId, { targetServiceId: 'backend-b', sourceSequence: 10 });
  assert.equal(result.status, 'succeeded');
  assert.equal(harness.authority.activeRegionId, 'india-standby');
  assert.equal(harness.authority.authorityEpoch, 2);
  assert.equal(harness.partitions.get('orchestration_node:v1:p0').activeRegionId, 'india-standby');
  assert.equal(harness.partitions.get('orchestration_node:v1:p0').regionalOwnershipEpoch, 2);
  harness.executeFailover(plan.planId, { targetServiceId: 'backend-b', sourceSequence: 10 });
  assert.equal(harness.authority.authorityEpoch, 2);
  assert.equal(harness.partitions.get('orchestration_node:v1:p0').regionalOwnershipEpoch, 2);
  assert.throws(() => harness.assertWrite({ regionId: 'india-primary', authorityEpoch: 1, authorityLeaseEpoch: 1 }), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');
  assert.equal(harness.invalidations.length, 2);
  assert.equal(harness.projections.get('india-standby:orchestration_timeline').status, 'active');
});

test('emergency failover refuses unknown freshness, missing acceptance, and unproven fencing', () => {
  const { harness } = setup();
  harness.isolateRegion('india-primary');
  harness.setReplication('india-primary', 'india-standby', {});
  const base = { idempotencyKey: 'emergency-safety', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', approved: true };
  assert.throws(() => harness.createFailoverPlan({ ...base, sourceFencePossible: true }), (error) => error.code === 'REGION_REPLICATION_UNKNOWN');
  harness.regions.get('india-primary').sourceFenced = false;
  assert.throws(() => harness.createFailoverPlan({ ...base, idempotencyKey: 'emergency-unfenced', sourceFencePossible: false, dataLossAccepted: true }), (error) => error.code === 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE');
  harness.authorityStoreAvailable = false;
  assert.throws(() => harness.createFailoverPlan({ ...base, idempotencyKey: 'emergency-store-down', sourceFencePossible: true, dataLossAccepted: true }), (error) => error.code === 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE');
  assert.throws(() => harness.assertWrite({ regionId: 'india-primary', authorityEpoch: 1, authorityLeaseEpoch: 1 }), (error) => error.code === 'REGION_WRITE_FROZEN');
});

test('regional outage resumes checkpoint work exactly once and preserves global accounting and trace lineage', () => {
  const { harness, authority } = setup();
  harness.delegationInvocations.set('delegation-global', 1);
  harness.compensations.set('compensation-global', 'completed');
  harness.cancellations.set('run-1', 'requested');
  harness.setReplication('india-primary', 'india-standby', { lagMs: 4_000, sequenceVerified: true });
  harness.enqueue({ logicalId: 'run-1:completed', runId: 'run-1', nodeKey: 'completed', partitionKey: 'orchestration_node:v1:p0' });
  harness.enqueue({ logicalId: 'run-1:queued', runId: 'run-1', nodeKey: 'queued', partitionKey: 'orchestration_node:v1:p0' });
  const first = harness.claim({ regionId: 'india-primary', serviceId: 'worker-a', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch });
  harness.complete({ logicalId: first.logicalId, regionId: 'india-primary', authorityEpoch: authority.authorityEpoch, authorityLeaseEpoch: authority.leaseEpoch, traceId: 'trace-run-1' });
  const checkpoint = harness.createCheckpoint({ checkpointId: 'checkpoint-run-1', runId: 'run-1', sourceRegionId: 'india-primary', authorityEpoch: 1, queueOwnershipEpoch: 1, routingVersion: 1, lastDurableSequence: 10, projectionSequence: 8, completedNodeKeys: ['completed'] });
  harness.stopRegionHeartbeats('india-primary');
  assert.equal(harness.evaluateHealth('india-primary').status, 'unavailable');
  harness.isolateRegion('india-primary');
  const incident = harness.createIncident({ sourceRegionId: 'india-primary' });
  const plan = harness.createFailoverPlan({ idempotencyKey: 'outage-run-1', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', incidentId: incident.incidentId, approved: true, sourceFencePossible: true });
  harness.executeFailover(plan.planId, { targetServiceId: 'backend-b', sourceSequence: 10 });
  const current = harness.authority;
  const resumed = harness.resumeCheckpoint({ checkpointId: checkpoint.checkpointId, regionId: 'india-standby', authorityEpoch: current.authorityEpoch, authorityLeaseEpoch: current.leaseEpoch, traceId: 'trace-run-1', failoverPlanId: plan.planId, regionalParentSpanId: 'primary-span' });
  assert.equal(resumed.completedWorkDuplicated, false);
  const second = harness.claim({ regionId: 'india-standby', serviceId: 'worker-b', authorityEpoch: current.authorityEpoch, authorityLeaseEpoch: current.leaseEpoch });
  harness.complete({ logicalId: second.logicalId, regionId: 'india-standby', authorityEpoch: current.authorityEpoch, authorityLeaseEpoch: current.leaseEpoch, traceId: 'trace-run-1', failoverPlanId: plan.planId, regionalParentSpanId: 'primary-span' });
  assert.equal(harness.jobs.get('run-1:completed').executionCount, 1);
  assert.equal(harness.jobs.get('run-1:queued').executionCount, 1);
  assert.equal(harness.delegationInvocations.get('delegation-global'), 1);
  assert.equal(harness.compensations.get('compensation-global'), 'completed');
  assert.equal(harness.cancellations.get('run-1'), 'requested');
  assert.equal(new Set(harness.traces.map((span) => span.logicalRunId)).size, 1);
  assert.ok(harness.traces.some((span) => span.executionRegionId === 'india-primary'));
  assert.ok(harness.traces.some((span) => span.executionRegionId === 'india-standby'));
});

test('restricted data cannot route or fail over to a region without declared classification support', () => {
  const { harness } = setup();
  const route = harness.route({ requestedRegionId: 'india-standby', consistencyClass: 'eventual_projection', dataClassification: 'restricted', residencyTags: ['india'] });
  assert.equal(route.outcome, 'route_primary');
  harness.isolateRegion('india-primary');
  harness.setReplication('india-primary', 'india-standby', { lagMs: 1_000, sequenceVerified: true });
  assert.throws(() => harness.createFailoverPlan({ idempotencyKey: 'restricted-failover', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', approved: true, sourceFencePossible: true, dataClassification: 'restricted', residencyTags: ['india'] }), (error) => error.code === 'REGION_CLASSIFICATION_DENIED');
});

test('backup verification, isolated restore, promotion approval, cleanup, and retention are deterministic', async () => {
  const { harness } = setup();
  const backup = await harness.requestBackup({ idempotencyKey: 'backup-integration', regionId: 'india-primary', retentionMs: 10_000, schemaVersion: '1', collectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 1, indexManifestVersion: '13E3', schemaVersion: '1', integrityMaterial: { count: 1, sequence: 2 } }] });
  const mismatch = await harness.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 2 }] });
  assert.equal(mismatch.valid, false);
  const verified = await harness.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 1, integrityMaterial: { count: 1, sequence: 2 } }] });
  assert.equal(verified.valid, true);
  const restore = await harness.requestRestore({ backupId: backup.backupId, targetRegionId: 'india-standby' });
  assert.equal(restore.externalInvocationsEnabled, false);
  assert.equal((await harness.validateRestore(restore.restoreId)).status, 'ready_for_promotion');
  assert.throws(() => harness.promoteRestore(restore.restoreId), (error) => error.code === 'REGION_RESTORE_APPROVAL_REQUIRED');
  assert.equal(harness.cleanupRestore(restore.restoreId).status, 'cleaned_up');
  harness.advance(10_001);
  assert.equal(await harness.backupAdapter.deleteExpiredBackupMetadata(harness.now()), 1);
});

test('failback waits for recovery and creates a fresh monotonically increasing authority epoch', () => {
  const { harness } = setup();
  harness.setReplication('india-primary', 'india-standby', { lagMs: 1_000, sequenceVerified: true });
  harness.isolateRegion('india-primary');
  const failover = harness.createFailoverPlan({ idempotencyKey: 'failover-before-failback', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', approved: true, sourceFencePossible: true });
  harness.executeFailover(failover.planId, { targetServiceId: 'backend-b', sourceSequence: 11 });
  harness.restoreRegion('india-primary');
  harness.setReplication('india-standby', 'india-primary', { lagMs: 500, sequenceVerified: true });
  const failback = harness.createFailoverPlan({ idempotencyKey: 'controlled-failback', sourceRegionId: 'india-standby', targetRegionId: 'india-primary', failoverType: 'planned_switchover', triggerType: 'operator', approved: true, sourceFencePossible: true });
  harness.executeFailover(failback.planId, { targetServiceId: 'backend-a', sourceSequence: 12 });
  assert.equal(harness.authority.activeRegionId, 'india-primary');
  assert.equal(harness.authority.authorityEpoch, 3);
  assert.throws(() => harness.assertWrite({ regionId: 'india-standby', authorityEpoch: 2, authorityLeaseEpoch: 2 }), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');
});

test('deterministic drills and evidence remain secret-free, tenant-bound, and bounded', () => {
  const { harness } = setup();
  const drill = harness.createDrill({ name: 'Regional drill', drillType: 'failover_and_failback', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', expectedRpoMs: 30_000, expectedRtoMs: 300_000, incidentId: 'incident-drill' });
  const result = harness.runDrill(drill.drillId);
  assert.equal(result.status, 'succeeded');
  assert.ok(result.safeFindings.includes('FAILBACK_EPOCH_VERIFIED'));
  assert.equal(result.measuredRpoMs <= result.expectedRpoMs, true);
  assert.equal(result.measuredRtoMs <= result.expectedRtoMs, true);
  core.assertNoSensitiveData(harness.audits);
  const evidence = JSON.stringify({ configuration: harness.configuration, regions: [...harness.regions.values()], services: [...harness.services.values()], authority: harness.authority, audits: harness.audits });
  assert.doesNotMatch(evidence, /mongodb(?:\+srv)?:\/\/|redis:\/\/|bearer\s|private.?key|authorization.?header/i);
});
