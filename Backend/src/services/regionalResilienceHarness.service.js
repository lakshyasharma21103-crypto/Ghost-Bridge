const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const core = require('./regionalResilienceCore.service');
const { MockBackupAdapter } = require('./regionalBackupAdapters.service');
const metrics = require('./regionalResilienceMetrics.service');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');

function copy(value) { return structuredClone(value); }

class DeterministicMultiRegionHarness {
  constructor(options = {}) {
    this.nowMs = Number(options.nowMs || Date.UTC(2026, 0, 1));
    this.authorityStoreAvailable = true;
    this.configuration = null;
    this.policy = null;
    this.regions = new Map();
    this.services = new Map();
    this.authority = null;
    this.authorityHistory = [];
    this.partitions = new Map();
    this.jobs = new Map();
    this.checkpoints = new Map();
    this.failoverPlans = new Map();
    this.incidents = new Map();
    this.caches = new Map();
    this.invalidations = [];
    this.projections = new Map();
    this.audits = [];
    this.traces = [];
    this.drills = new Map();
    this.admissionFrozen = false;
    this.delegationInvocations = new Map();
    this.compensations = new Map();
    this.cancellations = new Map();
    this.backupAdapter = options.backupAdapter || new MockBackupAdapter({ nowMs: this.nowMs });
  }

  now() { return new Date(this.nowMs); }
  advance(milliseconds) { this.nowMs += Math.max(0, Number(milliseconds) || 0); this.backupAdapter.advance?.(milliseconds); return this.now(); }
  audit(action, metadata = {}) { core.assertNoSensitiveData(metadata); const record = { sequence: this.audits.length + 1, action, metadata: copy(metadata), at: this.now() }; this.audits.push(record); return record; }

  activateConfiguration(input) {
    const configuration = core.normalizeRegionalConfiguration({ ...input, status: 'active' });
    this.configuration = { ...configuration, id: input.id || 'regional-configuration-1', status: 'active', version: configuration.version };
    this.regions.clear();
    for (const region of configuration.regions) this.regions.set(region.regionId, { ...copy(region), lastHeartbeatAt: this.now(), healthStatus: region.state === 'healthy' ? 'healthy' : 'unknown', sourceFenced: false });
    this.audit('regional.configuration.activated', { configurationId: this.configuration.id, version: configuration.version });
    return copy(this.configuration);
  }

  activatePolicy(input) {
    const policy = core.normalizeDisasterRecoveryPolicy({ ...input, status: 'active' });
    this.policy = { ...policy, id: input.id || 'dr-policy-1', status: 'active' };
    this.audit('regional.dr_policy.activated', { policyId: this.policy.id, version: policy.version, criticality: policy.criticality });
    return copy(this.policy);
  }

  registerService(input) {
    core.assertNoSensitiveData(input);
    const region = this.regions.get(input.regionId);
    if (!region) throw new AppError(404, 'REGION_NOT_FOUND', 'Region was not found.');
    const key = `${input.serviceId}:${input.instanceId}`;
    const current = this.services.get(key);
    const service = {
      serviceId: core.safeIdentifier(input.serviceId, 'serviceId'),
      instanceId: core.safeIdentifier(input.instanceId, 'instanceId'),
      regionId: input.regionId,
      serviceType: input.serviceType,
      state: input.state || 'active',
      maximumConcurrency: Math.max(0, Number(input.maximumConcurrency || 0)),
      activeClaimCount: Math.max(0, Number(input.activeClaimCount || 0)),
      supportedWorkloadCategories: [...new Set(input.supportedWorkloadCategories || [])],
      supportedRoutingVersions: [...new Set(input.supportedRoutingVersions || [1])],
      supportedRegionalOwnershipEpochs: [...new Set(input.supportedRegionalOwnershipEpochs || [0])],
      writeAuthorityEpoch: Number(input.writeAuthorityEpoch || 0),
      authorityLeaseEpoch: Number(input.authorityLeaseEpoch || 0),
      startedAt: current?.startedAt || this.now(),
      heartbeatAt: this.now(),
    };
    if (current && current.regionId !== service.regionId) throw new AppError(409, 'REGIONAL_SERVICE_IDENTITY_CONFLICT', 'A service identity cannot move regions while registered.');
    this.services.set(key, service);
    this.audit('regional.service.registered', { serviceType: service.serviceType, regionId: service.regionId, state: service.state });
    return copy(service);
  }

  heartbeatService(serviceId, instanceId) {
    const service = this.services.get(`${serviceId}:${instanceId}`);
    if (!service || ['stopped', 'isolated'].includes(service.state)) throw new AppError(409, 'REGIONAL_SERVICE_FENCED', 'Regional service is fenced.');
    service.heartbeatAt = this.now();
    return copy(service);
  }

  evaluateHealth(regionId) {
    const region = this.regions.get(regionId);
    if (!region) throw new AppError(404, 'REGION_NOT_FOUND', 'Region was not found.');
    const timeout = this.configuration.regionalHealthTimeoutMs;
    const services = [...this.services.values()].filter((item) => item.regionId === regionId);
    const healthy = services.filter((service) => ['active', 'idle'].includes(service.state) && this.nowMs - new Date(service.heartbeatAt).getTime() <= timeout);
    const unavailable = services.filter((service) => ['unhealthy', 'stopped', 'isolated'].includes(service.state) || this.nowMs - new Date(service.heartbeatAt).getTime() > timeout);
    const status = region.state === 'isolated' ? 'isolated' : unavailable.length === services.length && services.length ? 'unavailable' : unavailable.length ? 'degraded' : healthy.length ? 'healthy' : 'unknown';
    region.healthStatus = status;
    return { regionId, status, healthyServiceCount: healthy.length, degradedServiceCount: services.length - healthy.length - unavailable.length, unavailableServiceCount: unavailable.length, activeWorkerCount: healthy.filter((service) => service.serviceType.endsWith('worker')).length, replicationLagCategory: region.replication?.lagCategory || 'unknown', measuredReplicationLagMs: region.replication?.lagMs, writeAuthorityEpoch: this.authority?.authorityEpoch || 0, authorityLeaseHealth: !this.authority ? 'missing' : new Date(this.authority.leaseExpiresAt).getTime() <= this.nowMs ? 'expired' : 'healthy', generatedAt: this.now(), expiresAt: new Date(this.nowMs + timeout), safeReasonCodes: [status === 'healthy' ? 'REGION_HEALTHY' : `REGION_${status.toUpperCase()}`] };
  }

  setReplication(sourceRegionId, targetRegionId, input) {
    const result = core.assessReplicationHealth({ ...input, maximumPromotionLagMs: input.maximumPromotionLagMs ?? this.policy?.maximumPromotionReplicationLagMs ?? this.configuration?.maximumReplicationLagForPromotionMs });
    const target = this.regions.get(targetRegionId);
    if (!target || !this.regions.has(sourceRegionId)) throw new AppError(404, 'REGION_NOT_FOUND', 'Region was not found.');
    target.replication = { ...result, sourceRegionId, targetRegionId, generatedAt: this.now(), lastVerifiedAt: this.now() };
    return copy(target.replication);
  }

  acquireAuthority(input) {
    if (!this.authorityStoreAvailable) throw new AppError(503, 'REGION_AUTHORITY_STORE_UNAVAILABLE', 'Durable authority store is unavailable.');
    const region = this.regions.get(input.regionId);
    if (!region?.enabled || !region.supportsWriteAuthority) throw new AppError(409, 'REGION_AUTHORITY_INELIGIBLE', 'Region cannot hold write authority.');
    if (this.authority && new Date(this.authority.leaseExpiresAt).getTime() > this.nowMs) {
      if (this.authority.activeRegionId === input.regionId && this.authority.leaseOwnerServiceId === input.serviceId) return copy(this.authority);
      throw new AppError(409, 'REGION_WRITE_AUTHORITY_CONFLICT', 'A valid writer already exists.');
    }
    const epoch = (this.authority?.authorityEpoch || 0) + 1;
    this.authority = { authorityKey: input.authorityKey || 'platform', activeRegionId: input.regionId, authorityEpoch: epoch, status: 'active', leaseOwnerServiceId: input.serviceId, leaseId: `authority-lease-${epoch}`, leaseEpoch: (this.authority?.leaseEpoch || 0) + 1, leaseExpiresAt: new Date(this.nowMs + Number(input.leaseDurationMs || this.configuration.authorityLeaseDurationMs)), heartbeatAt: this.now(), lastTransitionId: `authority-transition-${epoch}`, lastTransitionAt: this.now() };
    this.authorityHistory.push({ transitionType: 'acquire', sourceAuthorityEpoch: epoch - 1, targetAuthorityEpoch: epoch, targetRegionId: input.regionId, committedAt: this.now() });
    this.syncAuthorityToServices();
    this.audit('regional.authority.acquired', { regionId: input.regionId, authorityEpoch: epoch });
    return copy(this.authority);
  }

  syncAuthorityToServices() {
    for (const service of this.services.values()) {
      if (service.regionId === this.authority?.activeRegionId && !['isolated', 'stopped'].includes(service.state)) {
        service.writeAuthorityEpoch = this.authority.authorityEpoch;
        service.authorityLeaseEpoch = this.authority.leaseEpoch;
      }
    }
  }

  renewAuthority(input) {
    this.assertWrite({ regionId: input.regionId, authorityEpoch: input.authorityEpoch, authorityLeaseEpoch: input.authorityLeaseEpoch, serviceId: input.serviceId, requireLeaseOwner: true });
    this.authority.leaseExpiresAt = new Date(this.nowMs + Number(input.leaseDurationMs || this.configuration.authorityLeaseDurationMs));
    this.authority.heartbeatAt = this.now();
    this.audit('regional.authority.renewed', { regionId: input.regionId, authorityEpoch: this.authority.authorityEpoch });
    return copy(this.authority);
  }

  assertWrite(input) {
    if (!this.authorityStoreAvailable) throw new AppError(503, 'REGION_WRITE_FROZEN', 'Writes are frozen because authority cannot be verified.');
    if (!this.authority || this.authority.status !== 'active') throw new AppError(409, this.authority?.status === 'transferring' ? 'REGION_FAILOVER_IN_PROGRESS' : 'REGION_WRITE_FROZEN', 'Regional writes are not active.');
    if (new Date(this.authority.leaseExpiresAt).getTime() <= this.nowMs) throw new AppError(409, 'REGION_AUTHORITY_LEASE_EXPIRED', 'Regional write-authority lease expired.');
    if (input.regionId !== this.authority.activeRegionId) { metrics.increment('regional_stale_writer_rejections', { safeReasonCode: 'REGION_NOT_WRITE_AUTHORITY' }); throw new AppError(409, 'REGION_NOT_WRITE_AUTHORITY', 'Region is not the active write authority.'); }
    if (Number(input.authorityEpoch) !== this.authority.authorityEpoch) { metrics.increment('regional_stale_writer_rejections', { safeReasonCode: 'REGION_AUTHORITY_EPOCH_STALE' }); throw new AppError(409, 'REGION_AUTHORITY_EPOCH_STALE', 'Regional write-authority epoch is stale.'); }
    if (Number(input.authorityLeaseEpoch) !== this.authority.leaseEpoch) throw new AppError(409, 'REGION_WRITE_FENCED', 'Regional authority lease epoch is stale.');
    if (input.requireLeaseOwner === true && input.serviceId !== this.authority.leaseOwnerServiceId) throw new AppError(409, 'REGION_WRITE_FENCED', 'Service does not own the authority lease.');
    return true;
  }

  freezeWrites(reasonCode = 'REGION_OPERATOR_FREEZE') {
    if (!this.authority) throw new AppError(404, 'REGION_WRITE_AUTHORITY_NOT_FOUND', 'Write authority was not found.');
    this.authority.status = 'frozen';
    this.admissionFrozen = true;
    this.audit('regional.authority.frozen', { authorityEpoch: this.authority.authorityEpoch, safeReasonCode: reasonCode });
    return copy(this.authority);
  }

  isolateRegion(regionId, reasonCode = 'REGION_OUTAGE') {
    const region = this.regions.get(regionId);
    if (!region) throw new AppError(404, 'REGION_NOT_FOUND', 'Region was not found.');
    region.state = 'isolated'; region.healthStatus = 'isolated'; region.sourceFenced = true;
    for (const service of this.services.values()) if (service.regionId === regionId) service.state = 'isolated';
    this.audit('regional.service.isolated', { regionId, safeReasonCode: reasonCode });
    return copy(region);
  }

  stopRegionHeartbeats(regionId) {
    for (const service of this.services.values()) if (service.regionId === regionId) service.heartbeatAt = new Date(this.nowMs - this.configuration.regionalHealthTimeoutMs - 1);
    const region = this.regions.get(regionId); if (region) region.healthStatus = 'unavailable';
  }

  restoreRegion(regionId, role = 'warm_standby') {
    const region = this.regions.get(regionId); if (!region) throw new AppError(404, 'REGION_NOT_FOUND', 'Region was not found.');
    region.state = 'healthy'; region.healthStatus = 'healthy'; region.role = role; region.sourceFenced = false;
    for (const service of this.services.values()) if (service.regionId === regionId) { service.state = service.serviceType.endsWith('worker') ? 'idle' : 'active'; service.heartbeatAt = this.now(); service.writeAuthorityEpoch = 0; service.authorityLeaseEpoch = 0; }
    this.audit('regional.service.recovered', { regionId, role });
    return copy(region);
  }

  createIncident(input) {
    const incidentId = input.incidentId || `incident-${this.incidents.size + 1}`;
    const incident = { incidentId, category: input.category || 'regional_outage', severity: input.severity || 'critical', status: 'open', sourceRegionId: input.sourceRegionId, safeReasonCodes: input.safeReasonCodes || ['REGION_UNAVAILABLE'], detectedAt: this.now() };
    core.assertNoSensitiveData(incident); this.incidents.set(incidentId, incident); this.audit('disaster_recovery.incident_linked', { incidentId, category: incident.category }); return copy(incident);
  }

  createFailoverPlan(input) {
    const replay = [...this.failoverPlans.values()].find((plan) => plan.idempotencyKey === input.idempotencyKey);
    if (replay) return { ...copy(replay), replayed: true };
    const source = this.regions.get(input.sourceRegionId); const target = this.regions.get(input.targetRegionId);
    const validation = core.validateFailoverPlan({ ...input, targetRegion: target, authorityEpoch: this.authority?.authorityEpoch || 0, authorityStoreReachable: this.authorityStoreAvailable, sourceFencePossible: source?.sourceFenced === true || input.sourceFencePossible === true, sourceHealthStatus: source?.healthStatus, replication: target?.replication, requireApproval: input.requireApproval ?? this.policy.requireApprovalForFailover });
    const planId = `failover-${this.failoverPlans.size + 1}`;
    const plan = { planId, idempotencyKey: input.idempotencyKey, sourceRegionId: source.regionId, targetRegionId: target.regionId, failoverType: validation.failoverType, triggerType: input.triggerType, status: 'approved', sourceAuthorityEpoch: validation.sourceAuthorityEpoch, targetAuthorityEpoch: validation.targetAuthorityEpoch, orderedSteps: validation.orderedSteps, completedStepCount: 0, failedStepCount: 0, expectedRpoMs: this.policy.recoveryPointObjectiveMs, expectedRtoMs: this.policy.recoveryTimeObjectiveMs, potentialDataLoss: validation.potentialDataLoss, dataLossAccepted: input.dataLossAccepted === true, incidentId: input.incidentId, requestId: input.requestId || `request-${planId}`, traceId: input.traceId || `trace-${planId}`, createdAt: this.now() };
    this.failoverPlans.set(planId, plan); this.audit('regional.failover.plan_created', { planId, failoverType: plan.failoverType, sourceRegionId: plan.sourceRegionId, targetRegionId: plan.targetRegionId }); return { ...copy(plan), replayed: false };
  }

  completeStep(plan, key) {
    const step = plan.orderedSteps.find((entry) => entry.stepKey === key); if (!step || step.status === 'completed') return;
    const dependenciesComplete = step.dependencyStepKeys.every((dependency) => plan.orderedSteps.find((entry) => entry.stepKey === dependency)?.status === 'completed');
    if (!dependenciesComplete) throw new AppError(409, 'REGION_FAILOVER_STEP_ORDER_INVALID', 'Failover steps must execute in order.');
    step.status = 'completed'; step.startedAt ||= this.now(); step.completedAt = this.now(); step.safeReasonCode = 'REGION_FAILOVER_STEP_COMPLETED'; plan.completedStepCount += 1;
    this.audit('regional.failover.step_completed', { planId: plan.planId, stepKey: key });
  }

  transferAuthority(input) {
    if (!this.authorityStoreAvailable) throw new AppError(503, 'REGION_AUTHORITY_STORE_UNAVAILABLE', 'Durable authority store is unavailable.');
    const plan = input.planId ? this.failoverPlans.get(input.planId) : null;
    const target = this.regions.get(input.targetRegionId);
    const source = this.regions.get(this.authority.activeRegionId);
    if (!target?.supportsWriteAuthority || !target.enabled) throw new AppError(409, 'REGION_AUTHORITY_INELIGIBLE', 'Target region cannot hold write authority.');
    if (!source?.sourceFenced && input.sourceFenced !== true) throw new AppError(409, 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE', 'Source fencing cannot be proven.');
    if (plan && this.authority.authorityEpoch !== plan.sourceAuthorityEpoch) {
      if (this.authority.activeRegionId === target.regionId && this.authority.authorityEpoch === plan.targetAuthorityEpoch) return copy(this.authority);
      throw new AppError(409, 'REGION_AUTHORITY_EPOCH_STALE', 'Failover plan authority epoch is stale.');
    }
    const previous = copy(this.authority); const epoch = previous.authorityEpoch + 1;
    this.authority = { ...previous, activeRegionId: target.regionId, authorityEpoch: epoch, status: 'active', leaseOwnerServiceId: input.serviceId, leaseId: `authority-lease-${epoch}`, leaseEpoch: previous.leaseEpoch + 1, leaseExpiresAt: new Date(this.nowMs + this.configuration.authorityLeaseDurationMs), heartbeatAt: this.now(), lastTransitionId: `authority-transition-${epoch}`, lastTransitionAt: this.now() };
    source.role = 'warm_standby'; source.state = 'demoted'; target.role = 'primary'; target.state = 'promoted';
    for (const service of this.services.values()) if (service.regionId === source.regionId) { service.writeAuthorityEpoch = previous.authorityEpoch; service.state = 'isolated'; }
    this.syncAuthorityToServices();
    this.authorityHistory.push({ transitionType: input.transitionType || 'transfer', sourceRegionId: source.regionId, targetRegionId: target.regionId, sourceAuthorityEpoch: previous.authorityEpoch, targetAuthorityEpoch: epoch, planId: input.planId, committedAt: this.now() });
    this.audit('regional.authority.transferred', { sourceRegionId: source.regionId, targetRegionId: target.regionId, sourceAuthorityEpoch: previous.authorityEpoch, targetAuthorityEpoch: epoch, planId: input.planId });
    return copy(this.authority);
  }

  ensurePartition(input) {
    const key = input.partitionKey;
    if (!this.partitions.has(key)) this.partitions.set(key, { partitionKey: key, workloadCategory: input.workloadCategory || 'orchestration_node', routingVersion: input.routingVersion || 1, homeRegionId: input.homeRegionId, activeRegionId: input.activeRegionId, fallbackRegionIds: input.fallbackRegionIds || [], regionalOwnershipEpoch: 1, regionalStatus: 'active' });
    return copy(this.partitions.get(key));
  }

  transferQueues(input) {
    let changed = 0;
    for (const partition of this.partitions.values()) {
      if (partition.activeRegionId !== input.sourceRegionId) continue;
      if (partition.lastTransferPlanId === input.planId && partition.activeRegionId === input.targetRegionId) continue;
      partition.activeRegionId = input.targetRegionId; partition.regionalOwnershipEpoch += 1; partition.regionalStatus = 'active'; partition.lastTransferPlanId = input.planId; changed += 1;
    }
    for (const service of this.services.values()) if (service.regionId === input.targetRegionId && service.serviceType.endsWith('worker')) service.supportedRegionalOwnershipEpochs = [...new Set([...service.supportedRegionalOwnershipEpochs, ...[...this.partitions.values()].filter((p) => p.activeRegionId === input.targetRegionId).map((p) => p.regionalOwnershipEpoch)])];
    this.audit('regional.queue.ownership_transferred', { sourceRegionId: input.sourceRegionId, targetRegionId: input.targetRegionId, changedPartitionCount: changed }); return changed;
  }

  enqueue(input) {
    const existing = this.jobs.get(input.logicalId); if (existing) return copy(existing);
    if (this.admissionFrozen && input.protectedOperation !== true) throw new AppError(409, 'REGION_FAILOVER_IN_PROGRESS', 'Regional admission is frozen.');
    const partition = this.partitions.get(input.partitionKey); if (!partition) throw new AppError(404, 'QUEUE_PARTITION_NOT_FOUND', 'Queue partition was not found.');
    const job = { logicalId: input.logicalId, partitionKey: input.partitionKey, status: 'queued', runId: input.runId, nodeKey: input.nodeKey, executionCount: 0, routingVersion: partition.routingVersion, regionalOwnershipEpoch: partition.regionalOwnershipEpoch, createdAt: this.now() };
    this.jobs.set(job.logicalId, job); return copy(job);
  }

  claim(input) {
    this.assertWrite(input);
    const worker = [...this.services.values()].find((service) => service.serviceId === input.serviceId && service.regionId === input.regionId && service.serviceType.endsWith('worker'));
    const job = [...this.jobs.values()].find((item) => item.status === 'queued'); if (!job) return null;
    const partition = this.partitions.get(job.partitionKey); const region = this.regions.get(input.regionId);
    const eligibility = core.evaluateWorkerRegionalEligibility({ worker: { ...worker, status: worker?.state, regionalStatus: worker?.state === 'isolated' ? 'isolated' : 'active' }, partition, authority: this.authority, requestedRegionalOwnershipEpoch: partition.regionalOwnershipEpoch, routingVersion: job.routingVersion, region, dataClassification: input.dataClassification || 'internal', residencyTags: input.residencyTags || [] });
    if (!eligibility.eligible) throw new AppError(409, eligibility.safeReasonCodes[0], 'Worker is not regionally eligible.');
    job.status = 'running'; job.claimRegionId = input.regionId; job.claimAuthorityEpoch = this.authority.authorityEpoch; job.claimAuthorityLeaseEpoch = this.authority.leaseEpoch; job.claimRegionalOwnershipEpoch = partition.regionalOwnershipEpoch; return copy(job);
  }

  complete(input) {
    this.assertWrite(input); const job = this.jobs.get(input.logicalId); if (!job || job.status !== 'running') throw new AppError(409, 'REGIONAL_JOB_CLAIM_INVALID', 'Regional job claim is invalid.');
    const partition = this.partitions.get(job.partitionKey);
    if (job.claimRegionId !== partition.activeRegionId || job.claimRegionalOwnershipEpoch !== partition.regionalOwnershipEpoch) throw new AppError(409, 'REGION_QUEUE_OWNERSHIP_EPOCH_STALE', 'Regional queue ownership is stale.');
    job.status = 'completed'; job.executionCount += 1; job.completedAt = this.now(); job.completedRegionId = input.regionId; this.traces.push({ traceId: input.traceId || `trace-${job.runId}`, logicalRunId: job.runId, nodeKey: job.nodeKey, executionRegionId: input.regionId, authorityEpoch: this.authority.authorityEpoch, regionalParentSpanId: input.regionalParentSpanId, failoverPlanId: input.failoverPlanId }); return copy(job);
  }

  createCheckpoint(input) {
    const checkpoint = { checkpointId: input.checkpointId || `checkpoint-${this.checkpoints.size + 1}`, runId: input.runId, sourceRegionId: input.sourceRegionId, authorityEpoch: input.authorityEpoch, queueOwnershipEpoch: input.queueOwnershipEpoch, routingVersion: input.routingVersion || 1, lastDurableSequence: input.lastDurableSequence || 0, projectionSequence: input.projectionSequence || 0, completedNodeKeys: [...new Set(input.completedNodeKeys || [])], createdAt: this.now(), status: 'verified' };
    this.checkpoints.set(checkpoint.checkpointId, checkpoint); return copy(checkpoint);
  }

  resumeCheckpoint(input) {
    this.assertWrite(input); const checkpoint = this.checkpoints.get(input.checkpointId); if (!checkpoint || checkpoint.status !== 'verified') throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_NOT_VERIFIED', 'Checkpoint is not verified.');
    const completed = new Set(checkpoint.completedNodeKeys);
    for (const job of this.jobs.values()) if (job.runId === checkpoint.runId && completed.has(job.nodeKey)) job.status = 'completed';
    this.traces.push({ traceId: input.traceId, logicalRunId: checkpoint.runId, executionRegionId: input.regionId, sourceRegionId: checkpoint.sourceRegionId, resumedFromRegionId: checkpoint.sourceRegionId, authorityEpoch: this.authority.authorityEpoch, failoverPlanId: input.failoverPlanId, regionalParentSpanId: input.regionalParentSpanId });
    return { checkpoint: copy(checkpoint), completedWorkDuplicated: false, resumedRegionId: input.regionId };
  }

  invalidateRegionalCaches(input) {
    const regions = input.allRegions ? [...this.regions.keys()] : [input.regionId]; let invalidated = 0;
    for (const regionId of regions) { const cache = this.caches.get(regionId); if (cache) { invalidated += cache.size; cache.clear(); } this.invalidations.push({ sequence: this.invalidations.length + 1, regionId, reasonCode: input.reasonCode || 'REGIONAL_AUTHORITY_CHANGED', tags: input.tags || ['active_alias', 'authority_sensitive'], createdAt: this.now() }); }
    this.audit('regional.cache.invalidated', { regionCount: regions.length, invalidationCategory: input.allRegions ? 'all_regions' : 'region_specific' }); return invalidated;
  }

  cacheSet(regionId, key, value) { if (!this.caches.has(regionId)) this.caches.set(regionId, new Map()); this.caches.get(regionId).set(key, copy(value)); }
  cacheGet(regionId, key) { return copy(this.caches.get(regionId)?.get(key) ?? null); }

  rebuildProjections(input) {
    const key = `${input.regionId}:${input.projectionName || 'orchestration_timeline'}`; const metadata = { projectionName: input.projectionName || 'orchestration_timeline', sourceRegionId: input.sourceRegionId, projectionRegionId: input.regionId, sourceAuthorityEpoch: this.authority.authorityEpoch, sourceSequence: input.sourceSequence, replicationCheckpoint: `sequence-${input.sourceSequence}`, generatedAt: this.now(), stalenessCategory: 'fresh', status: 'active' }; this.projections.set(key, metadata); this.audit('regional.projection.rebuild_completed', { projectionName: metadata.projectionName, projectionRegionId: input.regionId }); return copy(metadata);
  }

  route(input) { return core.evaluateRegionalRouting({ ...input, configuration: this.configuration, authority: this.authority }); }

  async requestBackup(input) { const result = await this.backupAdapter.requestBackup(input); this.audit('disaster_recovery.backup.completed', { backupId: result.backupId, regionId: result.regionId, status: result.status }); return result; }
  async verifyBackup(input) { const result = await this.backupAdapter.verifyBackup(input); this.audit(result.valid ? 'disaster_recovery.backup.verified' : 'disaster_recovery.backup.verification_failed', { backupId: result.backupId, integrityStatus: result.overallIntegrityStatus }); return result; }
  async requestRestore(input) { const result = await this.backupAdapter.requestRestore(input); this.audit('disaster_recovery.restore.requested', { restoreId: result.restoreId, targetRegionId: result.targetRegionId, restoreMode: 'isolated_validation' }); return result; }
  async validateRestore(restoreId) { const restore = this.backupAdapter.restores.get(restoreId); if (!restore) throw new AppError(404, 'REGION_RESTORE_NOT_FOUND', 'Restore was not found.'); restore.status = 'ready_for_promotion'; restore.integrityStatus = 'verified'; restore.migrationStatus = 'compatible'; restore.indexStatus = 'valid'; restore.projectionStatus = 'ready'; this.audit('disaster_recovery.restore.validated', { restoreId, status: restore.status }); return copy(restore); }
  promoteRestore(restoreId, input = {}) { const restore = this.backupAdapter.restores.get(restoreId); if (!restore || restore.status !== 'ready_for_promotion') throw new AppError(409, 'REGION_RESTORE_NOT_READY', 'Restore is not ready for promotion.'); if (input.approved !== true) throw new AppError(409, 'REGION_RESTORE_APPROVAL_REQUIRED', 'Restore promotion requires approval.', [], { approvalRequired: true }); restore.status = 'promoted'; restore.completedAt = this.now(); this.audit('disaster_recovery.restore.promoted', { restoreId, targetRegionId: restore.targetRegionId }); return copy(restore); }
  cleanupRestore(restoreId) { const restore = this.backupAdapter.restores.get(restoreId); if (!restore) throw new AppError(404, 'REGION_RESTORE_NOT_FOUND', 'Restore was not found.'); restore.status = 'cleaned_up'; this.audit('disaster_recovery.restore.cleaned_up', { restoreId }); return copy(restore); }

  executeFailover(planId, input) {
    const plan = this.failoverPlans.get(planId); if (!plan) throw new AppError(404, 'REGION_FAILOVER_PLAN_NOT_FOUND', 'Failover plan was not found.'); if (plan.status === 'succeeded') return copy(plan);
    plan.status = 'executing'; plan.startedAt ||= this.now(); this.admissionFrozen = true;
    for (const key of plan.orderedSteps.map((step) => step.stepKey)) {
      if (key === 'freeze_admission') this.admissionFrozen = true;
      if (key === 'fence_source' || key === 'freeze_source_authority') this.isolateRegion(plan.sourceRegionId, 'REGION_FAILOVER_FENCE');
      if (key === 'transfer_authority') this.transferAuthority({ targetRegionId: plan.targetRegionId, serviceId: input.targetServiceId, sourceFenced: true, planId });
      if (key === 'transfer_queues') { this.transferQueues({ sourceRegionId: plan.sourceRegionId, targetRegionId: plan.targetRegionId, planId }); plan.queueOwnershipTransferred = true; }
      if (key === 'invalidate_caches') { this.invalidateRegionalCaches({ allRegions: true }); plan.cacheInvalidated = true; }
      if (key === 'activate_target_workers') for (const service of this.services.values()) if (service.regionId === plan.targetRegionId && service.serviceType.endsWith('worker')) service.state = 'idle';
      if (key === 'rebuild_projections') { this.rebuildProjections({ sourceRegionId: plan.sourceRegionId, regionId: plan.targetRegionId, sourceSequence: input.sourceSequence || 1 }); plan.projectionsRecovered = true; }
      if (key === 'resume_admission') this.admissionFrozen = false;
      this.completeStep(plan, key);
    }
    this.admissionFrozen = false; plan.status = 'succeeded'; plan.completedAt = this.now();
    const incident = this.incidents.get(plan.incidentId); const incidentAt = incident?.detectedAt || plan.startedAt; const rpo = core.evaluateRpo({ objectiveMs: plan.expectedRpoMs, replicationStatus: this.regions.get(plan.targetRegionId).replication?.status, replicationLagMs: this.regions.get(plan.targetRegionId).replication?.lagMs, incidentAt, lastConfirmedDurableWriteAt: new Date(new Date(incidentAt).getTime() - Number(this.regions.get(plan.targetRegionId).replication?.lagMs || 0)) }); const rto = core.evaluateRto({ objectiveMs: plan.expectedRtoMs, incidentStartedAt: incidentAt, admissionResumedAt: this.now() }); plan.measuredRpoMs = rpo.measuredRpoMs; plan.measuredRtoMs = rto.measuredRtoMs; plan.rpoStatus = rpo.status; plan.rtoStatus = rto.status;
    this.audit('regional.failover.succeeded', { planId, failoverType: plan.failoverType, measuredRpoCategory: rpo.status, measuredRtoCategory: rto.status }); return copy(plan);
  }

  createDrill(input) { const drillId = `drill-${this.drills.size + 1}`; const drill = { drillId, ...copy(input), status: 'scheduled', createdAt: this.now() }; core.assertNoSensitiveData(drill); this.drills.set(drillId, drill); this.audit('disaster_recovery.drill.created', { drillId, drillType: drill.drillType }); return copy(drill); }
  runDrill(drillId) { const drill = this.drills.get(drillId); if (!drill) throw new AppError(404, 'REGION_DRILL_NOT_FOUND', 'DR drill was not found.'); drill.status = 'running'; drill.startedAt = this.now(); const findings = ['AUTHORITY_EPOCH_INCREMENT_VERIFIED', 'STALE_WRITER_REJECTION_VERIFIED', 'QUEUE_TRANSFER_VERIFIED', 'IDEMPOTENT_RECOVERY_VERIFIED', 'RESIDENCY_ENFORCEMENT_VERIFIED', 'FAILBACK_EPOCH_VERIFIED']; drill.safeFindings = findings; drill.measuredRpoMs = drill.expectedRpoMs; this.advance(1_000); drill.measuredRtoMs = 1_000; drill.status = 'succeeded'; drill.completedAt = this.now(); this.audit('disaster_recovery.drill.succeeded', { drillId, drillType: drill.drillType, result: drill.status }); return copy(drill); }
}

module.exports = { DeterministicMultiRegionHarness };
