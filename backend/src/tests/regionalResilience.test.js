const assert = require('node:assert/strict');
const test = require('node:test');
const models = require('../models');
const { getPermission } = require('../constants/permissionRegistry');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const core = require('../services/regionalResilienceCore.service');
const { MockBackupAdapter, NoopBackupAdapter } = require('../services/regionalBackupAdapters.service');
const metrics = require('../services/regionalResilienceMetrics.service');
const { assertRegionalWriteAuthority } = require('../services/regionalAuthority.service');
const regionalResilience = require('../services/regionalResilience.service');

function configuration() {
  return core.normalizeRegionalConfiguration({
    name: 'Two region test', version: 1,
    regions: [
      { regionId: 'india-primary', regionGroup: 'india', role: 'primary', state: 'healthy', priority: 1, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential', 'restricted'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true, maximumStalenessMs: 60_000 },
      { regionId: 'india-standby', regionGroup: 'india', role: 'warm_standby', state: 'healthy', priority: 2, dataResidencyTags: ['india'], allowedDataClassifications: ['public', 'internal', 'confidential'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true, maximumStalenessMs: 60_000 },
    ],
    preferredPrimaryRegionId: 'india-primary', defaultStandbyRegionId: 'india-standby',
    permittedFailoverRegionIds: ['india-primary', 'india-standby'], authorityLeaseDurationMs: 60_000,
    authorityHeartbeatIntervalMs: 15_000, regionalHealthTimeoutMs: 120_000, regionalHeartbeatIntervalMs: 30_000,
  });
}

function policy() {
  return core.normalizeDisasterRecoveryPolicy({
    name: 'Critical DR', version: 1, criticality: 'critical', recoveryPointObjectiveMs: 30_000,
    recoveryTimeObjectiveMs: 300_000, maximumPromotionReplicationLagMs: 10_000,
    maximumUnknownReplicationWindowMs: 0, maximumDegradedModeDurationMs: 3_600_000,
    preferredRecoveryRegionId: 'india-standby', permittedRecoveryRegionIds: ['india-primary', 'india-standby'],
    prohibitedRecoveryRegionIds: [], requireApprovalForFailover: true, requireApprovalForFailback: true,
    requireApprovalForDataLossAcceptance: true, backupFrequencyMs: 86_400_000,
    backupRetentionMs: 2_592_000_000, restoreVerificationFrequencyMs: 604_800_000,
    degradedMode: 'read_only', protectedOperationCategories: ['recovery', 'compensation', 'cancellation'],
  });
}

test('regional configuration validates bounded roles, priorities, and immutable-safe content', () => {
  const result = configuration();
  assert.equal(result.regions[0].role, 'primary');
  assert.equal(result.regions[1].priority, 2);
  assert.equal(core.validateRegionalConfiguration(result).valid, true);
  assert.throws(() => core.normalizeRegionalConfiguration({ ...result, regions: [{ ...result.regions[0], role: 'active_active' }] }), (error) => error.code === 'REGIONAL_RESILIENCE_VALIDATION_FAILED');
  assert.throws(() => core.normalizeRegionalConfiguration({ ...result, regions: [{ ...result.regions[0], priority: 1001 }] }), (error) => error.code === 'REGIONAL_RESILIENCE_VALIDATION_FAILED');
  assert.throws(() => core.assertNoSensitiveData({ databaseUri: 'mongodb://example' }), (error) => error.code === 'REGIONAL_RESILIENCE_VALIDATION_FAILED');
});

test('DR policy objectives, recovery regions, retention, and automatic promotion are bounded', () => {
  const result = policy();
  assert.equal(result.criticality, 'critical');
  assert.equal(core.validateDisasterRecoveryPolicy(result).valid, true);
  assert.throws(() => core.normalizeDisasterRecoveryPolicy({ ...result, recoveryPointObjectiveMs: 0 }), /validation/i);
  assert.throws(() => core.normalizeDisasterRecoveryPolicy({ ...result, preferredRecoveryRegionId: 'prohibited-region' }), /validation/i);
  assert.throws(() => core.normalizeDisasterRecoveryPolicy({ ...result, automaticFailoverAllowed: true, automaticFailoverConditions: ['target_healthy'] }), (error) => error.details?.some((detail) => /authority store/i.test(detail.message)));
});

test('routing sends strong writes to authority and exposes bounded eventual-read staleness', () => {
  const config = configuration();
  const authority = { activeRegionId: 'india-primary', authorityEpoch: 7, status: 'active' };
  const strong = core.evaluateRegionalRouting({ configuration: config, authority, requestedRegionId: 'india-standby', consistencyClass: CONSISTENCY_CLASSES.STRONG_AUTHORITY, dataClassification: 'internal', residencyTags: ['india'] });
  assert.equal(strong.outcome, 'route_primary');
  assert.equal(strong.selectedRegionId, 'india-primary');
  const eventual = core.evaluateRegionalRouting({ configuration: config, authority, requestedRegionId: 'india-standby', consistencyClass: CONSISTENCY_CLASSES.EVENTUAL_PROJECTION, projectionStalenessMs: 1_000, dataClassification: 'internal', residencyTags: ['india'], generatedAt: new Date('2026-01-01T00:00:00Z') });
  assert.equal(eventual.outcome, 'route_read_replica');
  assert.equal(eventual.stalenessCategory, 'bounded');
  assert.ok(eventual.generatedAt);
});

test('routing denies residency and supports only explicit read-only degraded routing', () => {
  const config = configuration();
  const authority = { activeRegionId: 'india-primary', authorityEpoch: 1, status: 'active' };
  const denied = core.evaluateRegionalRouting({ configuration: config, authority, requestedRegionId: 'india-standby', consistencyClass: CONSISTENCY_CLASSES.STRONG_AUTHORITY, dataClassification: 'restricted', residencyTags: ['eu'] });
  assert.equal(denied.outcome, 'reject_residency');
  const degradedConfig = { ...config, regions: config.regions.map((region) => region.regionId === 'india-standby' ? { ...region, state: 'degraded', maximumStalenessMs: 10 } : { ...region, state: 'unavailable' }) };
  const degraded = core.evaluateRegionalRouting({ configuration: degradedConfig, authority: { ...authority, status: 'frozen' }, requestedRegionId: 'india-standby', consistencyClass: CONSISTENCY_CLASSES.EVENTUAL_PROJECTION, projectionStalenessMs: 1_000, degradedMode: 'read_only', dataClassification: 'internal', residencyTags: ['india'] });
  assert.equal(degraded.outcome, 'degraded_read_only');
});

test('regional admission is authority, residency, failover, health, and capacity aware', () => {
  const targetRegion = configuration().regions[0];
  assert.equal(core.evaluateRegionalAdmission({ degradedMode: 'queue_only', durablePrimaryStorageAvailable: true }).decision, 'accepted_deferred');
  assert.equal(core.evaluateRegionalAdmission({ authority: { status: 'active' }, failoverInProgress: true, targetRegion }).decision, 'rejected_failover_in_progress');
  assert.equal(core.evaluateRegionalAdmission({ authority: { status: 'active' }, targetRegion, residencyTags: ['eu'], regionHealthStatus: 'healthy' }).decision, 'rejected_residency');
  assert.equal(core.evaluateRegionalAdmission({ authority: { status: 'active' }, targetRegion, residencyTags: ['india'], dataClassification: 'internal', regionHealthStatus: 'healthy', workerCapacityAvailable: false }).decision, 'accepted_deferred');
});

test('worker eligibility enforces authority and queue ownership epochs and regional classification', () => {
  const region = configuration().regions[0];
  const input = { worker: { status: 'active', regionalStatus: 'active', regionId: region.regionId, writeAuthorityEpoch: 3, supportedRoutingVersions: [1] }, partition: { activeRegionId: region.regionId, regionalOwnershipEpoch: 4 }, authority: { authorityEpoch: 3 }, requestedRegionalOwnershipEpoch: 4, routingVersion: 1, region, residencyTags: ['india'], dataClassification: 'restricted' };
  assert.equal(core.evaluateWorkerRegionalEligibility(input).eligible, true);
  assert.ok(core.evaluateWorkerRegionalEligibility({ ...input, requestedRegionalOwnershipEpoch: 3 }).safeReasonCodes.includes('REGION_QUEUE_OWNERSHIP_EPOCH_STALE'));
  assert.ok(core.evaluateWorkerRegionalEligibility({ ...input, worker: { ...input.worker, regionId: 'india-standby' } }).safeReasonCodes.includes('REGION_QUEUE_OWNERSHIP_MISMATCH'));
});

test('replication health never fabricates zero and unknown RPO is not compliant', () => {
  const unknown = core.assessReplicationHealth({ dataDomain: 'authority' });
  assert.equal(unknown.status, 'unknown');
  assert.equal(Object.hasOwn(unknown, 'lagMs'), false);
  assert.equal(unknown.promotionEligible, false);
  assert.equal(core.evaluateRpo({ objectiveMs: 30_000, replicationStatus: 'unknown' }).status, 'unknown');
  assert.equal(core.assessReplicationHealth({ lagMs: 2_000, sequenceVerified: true, maximumPromotionLagMs: 10_000 }).promotionEligible, true);
});

test('RPO and RTO calculations are deterministic and report breaches honestly', () => {
  const incidentAt = new Date('2026-01-01T00:01:00Z');
  assert.deepEqual(core.evaluateRpo({ objectiveMs: 30_000, replicationStatus: 'healthy', replicationLagMs: 2_000, incidentAt, lastConfirmedDurableWriteAt: new Date('2026-01-01T00:00:50Z') }).status, 'compliant');
  assert.equal(core.evaluateRto({ objectiveMs: 30_000, incidentStartedAt: incidentAt, admissionResumedAt: new Date('2026-01-01T00:02:00Z') }).status, 'breached');
  assert.equal(core.evaluateRto({ objectiveMs: 30_000 }).status, 'insufficient_data');
});

test('failover validation enforces ordering, approval, data-loss acceptance, and split-brain prevention', () => {
  const targetRegion = configuration().regions[1];
  const base = { failoverType: 'emergency_failover', triggerType: 'regional_outage', sourceRegionId: 'india-primary', targetRegionId: 'india-standby', targetRegion, sourceHealthStatus: 'isolated', authorityEpoch: 9, authorityStoreReachable: true, sourceFencePossible: true, replication: { status: 'healthy', promotionEligible: true }, requireApproval: true, approved: true, residencyTags: ['india'], dataClassification: 'internal' };
  const validated = core.validateFailoverPlan(base);
  assert.equal(validated.targetAuthorityEpoch, 10);
  assert.equal(validated.orderedSteps[0].order, 1);
  assert.ok(validated.orderedSteps.every((step, index) => index === 0 || step.dependencyStepKeys[0] === validated.orderedSteps[index - 1].stepKey));
  assert.throws(() => core.validateFailoverPlan({ ...base, sourceFencePossible: false }), (error) => error.code === 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE');
  assert.throws(() => core.validateFailoverPlan({ ...base, replication: { status: 'unknown', promotionEligible: false } }), (error) => error.code === 'REGION_REPLICATION_UNKNOWN');
  assert.throws(() => core.validateFailoverPlan({ ...base, approved: false }), (error) => error.code === 'REGION_FAILOVER_APPROVAL_REQUIRED');
  assert.throws(() => core.validateFailoverPlan({ ...base, targetHealthStatus: 'degraded' }), (error) => error.code === 'REGION_TARGET_NOT_READY');
});

test('workspace writes inherit organization authority and still fence stale epochs', async () => {
  const record = { authorityKey: 'organization:org-a', status: 'active', activeRegionId: 'india-primary', authorityEpoch: 7, leaseEpoch: 3, leaseExpiresAt: new Date(Date.now() + 60_000) };
  const dependencies = {
    RegionalWriteAuthority: {
      findOne: ({ authorityKey }) => ({ lean: async () => authorityKey === record.authorityKey ? record : null }),
    },
  };
  const result = await assertRegionalWriteAuthority({ organizationId: 'org-a', workspaceId: 'workspace-a', scope: 'workspace', regionId: 'india-primary', authorityEpoch: 7, authorityLeaseEpoch: 3, forceRegionalMode: true }, { dependencies });
  assert.equal(result.authority.authorityKey, 'organization:org-a');
  await assert.rejects(
    assertRegionalWriteAuthority({ organizationId: 'org-a', workspaceId: 'workspace-a', scope: 'workspace', regionId: 'india-primary', authorityEpoch: 6, forceRegionalMode: true }, { dependencies }),
    (error) => error.code === 'REGION_AUTHORITY_EPOCH_STALE',
  );
});

test('restore promotion ignores client approval assertions and requires a consumed durable grant', async () => {
  const restoreId = '507f1f77bcf86cd799439011';
  function restore() {
    return { _id: restoreId, organizationId: 'org-a', workspaceId: 'workspace-a', requestedBy: 'partner:org-a', backupId: 'backup-a', targetRegionId: 'india-standby', status: 'ready_for_promotion', approvalRequestId: 'apr-real', integrityStatus: 'verified', migrationStatus: 'compatible', indexStatus: 'valid', save: async function save() { return this; } };
  }
  const caller = { partner: { _id: 'org-a' }, requestId: 'request-a', traceId: 'trace-a' };
  const baseDependencies = {
    DisasterRecoveryRestore: { findOne: async () => restore() },
    assertAuthorized: async () => ({ policySnapshotRevision: 4 }),
    assertOperationalAccess: async () => ({ allowed: true }),
    audit: async () => ({}),
    consumeApprovalGrants: async () => ({}),
  };
  await assert.rejects(
    regionalResilience.promoteRestore(restoreId, { workspaceId: 'workspace-a', approvalSatisfied: true, approvalRequestId: 'apr-real' }, caller, { dependencies: { ...baseDependencies, enforceApproval: async () => ({ required: false, approvals: [] }) } }),
    (error) => error.code === 'REGION_RESTORE_APPROVAL_REQUIRED',
  );
  let consumed = false;
  const promoted = await regionalResilience.promoteRestore(restoreId, { workspaceId: 'workspace-a', approvalRequestId: 'apr-real' }, caller, { dependencies: { ...baseDependencies, enforceApproval: async () => ({ required: true, approvals: [{}] }), consumeApprovalGrants: async () => { consumed = true; } } });
  assert.equal(promoted.status, 'promoted');
  assert.equal(consumed, true);
});

test('failover and restore state machines reject invalid transitions', () => {
  assert.equal(core.transitionFailover('requested', 'validating'), 'validating');
  assert.equal(core.transitionRestore('requested', 'approval_required'), 'approval_required');
  assert.throws(() => core.transitionFailover('requested', 'succeeded'), (error) => error.code === 'REGION_FAILOVER_TRANSITION_INVALID');
  assert.throws(() => core.transitionRestore('requested', 'promoted'), (error) => error.code === 'REGION_RESTORE_TRANSITION_INVALID');
});

test('regional cache keys isolate region and scope without embedding tenant identifiers or secrets', () => {
  const first = core.createRegionalCacheKey({ regionId: 'india-primary', namespace: 'active-policy', organizationId: 'tenant-alpha', workspaceId: 'workspace-alpha', identity: { alias: 'active' } });
  const second = core.createRegionalCacheKey({ regionId: 'india-standby', namespace: 'active-policy', organizationId: 'tenant-alpha', workspaceId: 'workspace-alpha', identity: { alias: 'active' } });
  assert.notEqual(first, second);
  assert.equal(first.includes('tenant-alpha'), false);
  assert.equal(first.includes('workspace-alpha'), false);
});

test('projection staleness is explicit and bounded', () => {
  assert.equal(core.projectionStaleness({}).stalenessCategory, 'unknown');
  const result = core.projectionStaleness({ generatedAt: new Date('2026-01-01T00:00:00Z'), now: new Date('2026-01-01T00:00:15Z'), maximumStalenessMs: 10_000, sourceRegionId: 'india-primary' });
  assert.equal(result.stalenessCategory, 'bounded');
  assert.equal(result.stalenessMs, 15_000);
});

test('backup integrity uses keyed digests and isolated restore disables external effects', async () => {
  const adapter = new MockBackupAdapter();
  const backup = await adapter.requestBackup({ idempotencyKey: 'backup-unit-1', regionId: 'india-primary', schemaVersion: '1', collectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 2, integrityMaterial: { count: 2, sequence: 7 } }] });
  const verified = await adapter.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 2, integrityMaterial: { count: 2, sequence: 7 } }] });
  assert.equal(verified.valid, true);
  const failed = await adapter.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 3 }] });
  assert.equal(failed.valid, false);
  await adapter.verifyBackup({ backupId: backup.backupId, expectedCollectionSummaries: [{ collectionName: 'orchestrationruns', safeDocumentCount: 2, integrityMaterial: { count: 2, sequence: 7 } }] });
  const restore = await adapter.requestRestore({ backupId: backup.backupId, targetRegionId: 'india-standby' });
  assert.equal(restore.externalInvocationsEnabled, false);
  assert.equal(restore.credentialUseEnabled, false);
  assert.equal(restore.outboundCallbacksEnabled, false);
  await assert.rejects(new NoopBackupAdapter().requestBackup({}), (error) => error.code === 'REGION_BACKUP_ADAPTER_DISABLED');
});

test('regional models have required unique and scoped indexes without sensitive fields', () => {
  const authorityIndexes = models.RegionalWriteAuthority.schema.indexes();
  assert.ok(authorityIndexes.some(([keys, options]) => keys.authorityKey === 1 && options.unique));
  const failoverIndexes = models.RegionalFailoverPlan.schema.indexes();
  assert.ok(failoverIndexes.some(([keys]) => keys.organizationId === 1 && keys.workspaceId === 1 && keys.status === 1));
  for (const model of [models.RegionalDeploymentConfiguration, models.RegionalServiceRegistration, models.RegionalHealthSnapshot, models.RegionalWriteAuthority, models.RegionalReplicationHealth, models.RegionalFailoverPlan, models.BackupManifest, models.BackupIntegrityManifest, models.DisasterRecoveryRestore]) {
    const paths = Object.keys(model.schema.paths).join(' ');
    assert.doesNotMatch(paths, /password|authorizationHeader|databaseUri|signedUrl|privateHostname|cloudToken/i);
  }
});

test('critical regional RBAC defaults exclude viewers and metrics discard high-cardinality labels', () => {
  for (const permission of ['regionalOperations.isolate', 'regionalOperations.freezeWrites', 'regionalFailover.execute', 'regionalFailover.acceptDataLoss', 'regionalFailover.failback', 'disasterRecoveryRestore.promote', 'disasterRecoveryDrill.run']) {
    const entry = getPermission(permission);
    assert.equal(entry.defaultRoles.includes('viewer'), false);
    assert.ok(['HIGH', 'CRITICAL'].includes(entry.riskLevel));
  }
  metrics.reset();
  metrics.increment('regional_failover_count', { outcome: 'succeeded', organizationId: 'tenant-must-not-leak', traceId: 'trace-must-not-leak' });
  assert.equal(JSON.stringify(metrics.snapshot()).includes('tenant-must-not-leak'), false);
  assert.equal(core.metricLabelsAreBounded(metrics.snapshot()).safe, true);
});
