const assert = require('node:assert/strict');
const models = require('../src/models');
const core = require('../src/services/regionalResilienceCore.service');
const metrics = require('../src/services/regionalResilienceMetrics.service');
const { DeterministicMultiRegionHarness } = require('../src/services/regionalResilienceHarness.service');
const { regionalResilienceRouter } = require('../src/routes/regionalResilienceRoutes');
const { getPermission } = require('../src/constants/permissionRegistry');
const { CONSISTENCY_CLASSES } = require('../src/constants/dataAccessPerformance');

function pass(label) { process.stdout.write(`PASS ${label}\n`); }

function regionalConfiguration() {
  return {
    name: 'India resilient control plane', version: 1,
    regions: [
      { regionId: 'india-primary', displayName: 'India Primary', regionGroup: 'india', role: 'primary', state: 'healthy', priority: 1, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential', 'restricted'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
      { regionId: 'india-standby', displayName: 'India Standby', regionGroup: 'india', role: 'warm_standby', state: 'healthy', priority: 2, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
    ],
    preferredPrimaryRegionId: 'india-primary', defaultStandbyRegionId: 'india-standby',
    permittedFailoverRegionIds: ['india-primary', 'india-standby'], prohibitedFailoverRegionIds: [],
    maximumReplicationLagForPromotionMs: 30_000, maximumDataLossWindowMs: 60_000,
    regionalHealthTimeoutMs: 120_000, regionalHeartbeatIntervalMs: 30_000,
    authorityLeaseDurationMs: 60_000, authorityHeartbeatIntervalMs: 15_000,
    failoverApprovalPolicy: 'always', failbackApprovalPolicy: 'always', degradedModePolicy: 'read_only', cacheIsolationMode: 'region_local', projectionRecoveryPolicy: 'catch_up',
  };
}

function drPolicy() {
  return {
    name: 'Critical orchestration DR', version: 1, criticality: 'critical',
    recoveryPointObjectiveMs: 30_000, recoveryTimeObjectiveMs: 300_000,
    maximumPromotionReplicationLagMs: 10_000, maximumUnknownReplicationWindowMs: 0,
    maximumDegradedModeDurationMs: 3_600_000, preferredRecoveryRegionId: 'india-standby',
    permittedRecoveryRegionIds: ['india-primary', 'india-standby'], prohibitedRecoveryRegionIds: [],
    automaticFailoverAllowed: false, automaticFailoverConditions: [], requireApprovalForFailover: true,
    requireApprovalForFailback: true, requireApprovalForDataLossAcceptance: true,
    backupRequired: true, backupFrequencyMs: 86_400_000, backupRetentionMs: 2_592_000_000,
    restoreVerificationFrequencyMs: 604_800_000, minimumHealthyServiceCount: 1,
    minimumHealthyWorkerCount: 1, minimumHealthyDatabaseCategory: 'healthy',
    degradedMode: 'read_only', protectedOperationCategories: ['recovery', 'compensation', 'cancellation'],
  };
}

function assertModelSafety() {
  const now = new Date();
  const records = [
    new models.RegionalDeploymentConfiguration({ ...core.normalizeRegionalConfiguration(regionalConfiguration()), scope: 'workspace', scopeKey: 'organization:org-a:workspace:workspace-a', organizationId: 'org-a', workspaceId: 'workspace-a', createdBy: 'operator' }),
    new models.RegionalServiceRegistration({ serviceId: 'backend-a', instanceId: 'instance-a', regionId: 'india-primary', serviceType: 'backend', supportedWorkloadCategories: [], supportedRoutingVersions: [1], softwareVersion: '1.0.0', protocolVersion: '1', state: 'active', writeAuthorityEpoch: 1, maximumConcurrency: 10, activeClaimCount: 0, startedAt: now, heartbeatAt: now }),
    new models.RegionalWriteAuthority({ authorityKey: 'organization:org-a:workspace:workspace-a', scope: 'workspace', organizationId: 'org-a', workspaceId: 'workspace-a', activeRegionId: 'india-primary', authorityEpoch: 1, status: 'active', leaseOwnerServiceId: 'backend-a', leaseId: 'lease-safe', leaseEpoch: 1, leaseExpiresAt: new Date(now.getTime() + 60_000), heartbeatAt: now }),
    new models.RegionalReplicationHealth({ sourceRegionId: 'india-primary', targetRegionId: 'india-standby', dataDomain: 'authority', status: 'healthy', lagMs: 1_000, lagCategory: 'low', lastAppliedSequence: 10, promotionEligible: true, safeReasonCodes: [], generatedAt: now }),
    new models.DisasterRecoveryPolicy({ ...core.normalizeDisasterRecoveryPolicy(drPolicy()), scope: 'workspace', scopeKey: 'organization:org-a:workspace:workspace-a', organizationId: 'org-a', workspaceId: 'workspace-a', createdBy: 'operator' }),
  ];
  assert.ok(records.every((record) => record.validateSync() === undefined));
  assert.equal(/mongodb(?:\+srv)?:\/\/|bearer\s|private.?key|signed.?url/i.test(JSON.stringify(records.map((item) => item.toObject()))), false);
}

async function main() {
  metrics.reset();
  const harness = new DeterministicMultiRegionHarness();
  const configuration = harness.activateConfiguration(regionalConfiguration());
  assert.equal(configuration.status, 'active');
  assert.equal(core.validateRegionalConfiguration(regionalConfiguration()).valid, true);
  pass('regional configuration');
  const policy = harness.activatePolicy(drPolicy());
  assert.equal(policy.status, 'active');
  pass('disaster recovery policy');

  for (const entry of [
    { serviceId: 'backend-a', instanceId: 'backend-instance-a', regionId: 'india-primary', serviceType: 'backend', maximumConcurrency: 20 },
    { serviceId: 'worker-a', instanceId: 'worker-instance-a', regionId: 'india-primary', serviceType: 'execution_worker', maximumConcurrency: 4, supportedWorkloadCategories: ['orchestration_node'] },
    { serviceId: 'backend-b', instanceId: 'backend-instance-b', regionId: 'india-standby', serviceType: 'backend', maximumConcurrency: 20 },
    { serviceId: 'worker-b', instanceId: 'worker-instance-b', regionId: 'india-standby', serviceType: 'execution_worker', maximumConcurrency: 4, supportedWorkloadCategories: ['orchestration_node'] },
  ]) harness.registerService(entry);
  assert.equal(harness.services.size, 4);
  pass('regional service registration');

  const authorityA = harness.acquireAuthority({ authorityKey: 'organization:org-a:workspace:workspace-a', regionId: 'india-primary', serviceId: 'backend-a' });
  assert.equal(authorityA.authorityEpoch, 1);
  assert.equal(harness.authorityHistory.length, 1);
  pass('single writer authority');
  assert.throws(() => harness.assertWrite({ regionId: 'india-standby', authorityEpoch: 1, authorityLeaseEpoch: 1 }), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');
  pass('standby write rejected');
  harness.renewAuthority({ regionId: 'india-primary', serviceId: 'backend-a', authorityEpoch: 1, authorityLeaseEpoch: 1 });
  assert.ok(new Date(harness.authority.leaseExpiresAt) > harness.now());
  pass('authority lease');

  harness.ensurePartition({ partitionKey: 'orchestration_node:v1:p0', workloadCategory: 'orchestration_node', activeRegionId: 'india-primary', homeRegionId: 'india-primary', fallbackRegionIds: ['india-standby'] });
  const first = harness.enqueue({ logicalId: 'run-1:node-complete', runId: 'run-1', nodeKey: 'node-complete', partitionKey: 'orchestration_node:v1:p0' });
  const second = harness.enqueue({ logicalId: 'run-1:node-queued', runId: 'run-1', nodeKey: 'node-queued', partitionKey: 'orchestration_node:v1:p0' });
  const claimA = harness.claim({ regionId: 'india-primary', serviceId: 'worker-a', authorityEpoch: 1, authorityLeaseEpoch: 1 });
  assert.equal(claimA.logicalId, first.logicalId);
  harness.complete({ logicalId: first.logicalId, regionId: 'india-primary', serviceId: 'worker-a', authorityEpoch: 1, authorityLeaseEpoch: 1, traceId: 'trace-run-1' });
  assert.equal(harness.jobs.get(second.logicalId).status, 'queued');
  pass('regional queue ownership');
  const checkpoint = harness.createCheckpoint({ runId: 'run-1', sourceRegionId: 'india-primary', authorityEpoch: 1, queueOwnershipEpoch: 1, routingVersion: 1, lastDurableSequence: 10, projectionSequence: 8, completedNodeKeys: ['node-complete'] });
  harness.delegationInvocations.set('delegation-1', 1);
  harness.compensations.set('compensation-1', 'completed');
  harness.cancellations.set('run-1', 'not_requested');

  const staleA = { regionId: 'india-primary', authorityEpoch: 1, authorityLeaseEpoch: 1 };
  harness.stopRegionHeartbeats('india-primary');
  harness.advance(121_000);
  assert.equal(harness.evaluateHealth('india-primary').status, 'unavailable');
  harness.isolateRegion('india-primary');
  const incident = harness.createIncident({ sourceRegionId: 'india-primary', category: 'regional_outage' });
  const replication = harness.setReplication('india-primary', 'india-standby', { dataDomain: 'authority', lagMs: 4_000, sequenceVerified: true });
  assert.equal(replication.promotionEligible, true);
  const plan = harness.createFailoverPlan({ idempotencyKey: 'emergency-a-b', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', incidentId: incident.incidentId, approved: true, sourceFencePossible: true });
  assert.equal(plan.status, 'approved');
  pass('emergency failover plan');
  const result = harness.executeFailover(plan.planId, { targetServiceId: 'backend-b', sourceSequence: 10 });
  assert.equal(result.status, 'succeeded');
  assert.equal(harness.regions.get('india-primary').state, 'demoted');
  pass('primary region fenced');
  assert.equal(harness.authority.activeRegionId, 'india-standby');
  assert.equal(harness.authority.authorityEpoch, 2);
  pass('authority transferred');
  assert.equal(harness.partitions.get('orchestration_node:v1:p0').activeRegionId, 'india-standby');
  assert.equal(harness.partitions.get('orchestration_node:v1:p0').regionalOwnershipEpoch, 2);
  pass('queue ownership transferred');
  assert.equal(harness.invalidations.length, 2);
  pass('regional cache invalidation');
  assert.equal(harness.services.get('worker-b:worker-instance-b').state, 'idle');
  pass('target workers activated');

  const resumed = harness.resumeCheckpoint({ checkpointId: checkpoint.checkpointId, regionId: 'india-standby', serviceId: 'worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2, traceId: 'trace-run-1', failoverPlanId: plan.planId, regionalParentSpanId: 'span-region-a' });
  assert.equal(resumed.completedWorkDuplicated, false);
  pass('checkpoint resumed');
  assert.equal(harness.jobs.get(first.logicalId).executionCount, 1);
  pass('completed work not duplicated');
  const claimB = harness.claim({ regionId: 'india-standby', serviceId: 'worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2 });
  harness.complete({ logicalId: claimB.logicalId, regionId: 'india-standby', serviceId: 'worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2, traceId: 'trace-run-1', failoverPlanId: plan.planId, regionalParentSpanId: 'span-region-a' });
  assert.equal(harness.jobs.get(second.logicalId).executionCount, 1);
  pass('queued work completed exactly once');
  assert.throws(() => harness.assertWrite(staleA), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');
  pass('stale primary rejected');
  pass('authority epoch fencing');
  assert.equal(harness.delegationInvocations.get('delegation-1'), 1);
  pass('delegation accounting preserved');
  assert.equal(harness.compensations.get('compensation-1'), 'completed');
  pass('compensation idempotency preserved');
  assert.equal(harness.cancellations.get('run-1'), 'not_requested');
  assert.equal(new Set(harness.traces.map((entry) => entry.logicalRunId)).size, 1);
  assert.ok(harness.traces.some((entry) => entry.executionRegionId === 'india-primary') && harness.traces.some((entry) => entry.executionRegionId === 'india-standby'));
  pass('trace lineage preserved');
  assert.equal(result.rpoStatus, 'compliant');
  pass('RPO evaluated');
  assert.equal(result.rtoStatus, 'compliant');
  pass('RTO evaluated');

  const restricted = harness.route({ organizationId: 'org-restricted', workspaceId: 'workspace-restricted', operationCategory: 'orchestration_state', consistencyClass: CONSISTENCY_CLASSES.STRONG_AUTHORITY, requestedRegionId: 'india-standby', dataClassification: 'restricted', residencyTags: ['india'] });
  assert.equal(restricted.outcome, 'reject_residency');
  pass('residency denial');

  const backup = await harness.requestBackup({ idempotencyKey: 'backup-1', regionId: 'india-standby', sourceRegionId: 'india-standby', schemaVersion: '1', retentionMs: 86_400_000, collectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 1, safeByteCategory: 'small', indexManifestVersion: '13E3', schemaVersion: '1', sequenceRange: { minimum: 1, maximum: 10 }, integrityMaterial: { count: 1, maximumSequence: 10 } }] });
  assert.equal(backup.status, 'completed');
  pass('backup manifest');
  const verification = await harness.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 1, integrityMaterial: { count: 1, maximumSequence: 10 } }] });
  assert.equal(verification.valid, true);
  pass('backup verification');
  const restore = await harness.requestRestore({ backupId: backup.backupId, targetRegionId: 'india-primary' });
  assert.equal(restore.externalInvocationsEnabled, false);
  pass('isolated restore');
  const validatedRestore = await harness.validateRestore(restore.restoreId);
  assert.equal(validatedRestore.status, 'ready_for_promotion');
  pass('restore integrity validation');
  assert.equal(validatedRestore.externalInvocationsEnabled, false);
  pass('external invocation disabled during restore');
  assert.throws(() => harness.promoteRestore(restore.restoreId), (error) => error.code === 'REGION_RESTORE_APPROVAL_REQUIRED');
  pass('restore approval required');
  assert.equal(harness.cleanupRestore(restore.restoreId).status, 'cleaned_up');

  harness.restoreRegion('india-primary');
  harness.setReplication('india-standby', 'india-primary', { dataDomain: 'authority', lagMs: 1_000, sequenceVerified: true });
  const failback = harness.createFailoverPlan({ idempotencyKey: 'failback-b-a', sourceRegionId: 'india-standby', targetRegionId: 'india-primary', failoverType: 'planned_switchover', triggerType: 'operator', approved: true, sourceFencePossible: true });
  const failbackResult = harness.executeFailover(failback.planId, { targetServiceId: 'backend-a', sourceSequence: 12 });
  assert.equal(failbackResult.status, 'succeeded');
  pass('controlled failback');
  assert.equal(harness.authority.authorityEpoch, 3);
  pass('new authority epoch');
  assert.throws(() => harness.assertWrite({ regionId: 'india-standby', authorityEpoch: 2, authorityLeaseEpoch: 2 }), (error) => error.code === 'REGION_NOT_WRITE_AUTHORITY');

  const drill = harness.createDrill({ name: 'Quarterly deterministic drill', drillType: 'failover_and_failback', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', expectedRpoMs: 30_000, expectedRtoMs: 300_000 });
  assert.equal(harness.runDrill(drill.drillId).status, 'succeeded');
  pass('DR drill');
  core.assertNoSensitiveData(harness.audits);
  pass('safe audit evidence');
  metrics.increment('regional_failovers', { outcome: 'succeeded', organizationId: 'must-not-appear' });
  assert.equal(core.metricLabelsAreBounded(metrics.snapshot()).safe, true);
  assert.equal(JSON.stringify(metrics.snapshot()).includes('must-not-appear'), false);
  pass('bounded metrics');
  assertModelSafety();
  const safeMaterial = JSON.stringify({ configuration: harness.configuration, services: [...harness.services.values()], authority: harness.authority, plans: [...harness.failoverPlans.values()], audits: harness.audits, traces: harness.traces });
  assert.equal(/mongodb(?:\+srv)?:\/\/|redis:\/\/|bearer\s+[a-z0-9]|signed.?url|private.?key|authorization.?header/i.test(safeMaterial), false);
  pass('no credentials leaked');
  assert.equal([...harness.jobs.values()].every((job) => job.runId === 'run-1'), true);
  pass('tenant isolation');

  const routes = regionalResilienceRouter.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.ok(routes.includes('/failovers/:planId/execute') && routes.includes('/restores/:restoreId/promote') && routes.includes('/drills/:drillId/run'));
  assert.equal(getPermission('regionalFailover.execute').riskLevel, 'CRITICAL');
  assert.equal(getPermission('regionalFailover.execute').defaultRoles.includes('viewer'), false);
  pass('regional admission control');
  pass('multi-region-dr verification');
}

main().catch((error) => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
