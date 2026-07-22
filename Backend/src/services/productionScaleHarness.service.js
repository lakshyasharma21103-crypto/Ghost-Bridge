const {
  defaultScaleConfiguration,
  fairSchedule,
  routeWorkload,
  stableHashInteger,
} = require('./productionScale.service');
const { WORKLOAD_DEFINITIONS } = require('../constants/productionScale');

class DeterministicScaleHarness {
  constructor(options = {}) {
    this.nowMs = new Date(options.now || '2026-01-01T00:00:00.000Z').getTime();
    this.configuration = options.configuration || defaultScaleConfiguration('harness');
    this.workers = new Map();
    this.partitions = new Map();
    this.jobs = new Map();
    this.logicalJobs = new Map();
    this.reservations = new Map();
    this.tenantSlots = new Map();
    this.workspaceSlots = new Map();
    this.completions = [];
    this.serviceCounts = new Map();
    this.lastServedAt = new Map();
  }

  now() {
    return new Date(this.nowMs);
  }

  advance(milliseconds) {
    this.nowMs += Math.max(0, Number(milliseconds || 0));
    return this.now();
  }

  registerWorker(input) {
    const existing = this.workers.get(input.workerId);
    if (existing && existing.instanceId !== input.instanceId && !['stopped', 'unhealthy'].includes(existing.status)) {
      throw Object.assign(new Error('Worker identity conflict.'), { code: 'WORKER_IDENTITY_CONFLICT' });
    }
    const worker = {
      workerId: input.workerId,
      instanceId: input.instanceId,
      workerPool: input.workerPool,
      supportedWorkloadCategories: input.supportedWorkloadCategories || Object.keys(WORKLOAD_DEFINITIONS).filter((category) => WORKLOAD_DEFINITIONS[category].workerPool === input.workerPool),
      supportedRoutingVersions: input.supportedRoutingVersions || [1],
      maximumConcurrency: input.maximumConcurrency || 1,
      activeClaimCount: 0,
      status: input.status || 'idle',
      heartbeatAt: this.now(),
    };
    this.workers.set(worker.workerId, worker);
    return { ...worker };
  }

  enqueue(input) {
    const logicalKey = `${input.organizationId}:${input.workspaceId}:${input.logicalId}`;
    const existingId = this.logicalJobs.get(logicalKey);
    if (existingId) return { ...this.jobs.get(existingId), idempotencyReplayed: true };
    const route = routeWorkload(
      {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        routingKey: input.routingKey || input.logicalId,
        workloadCategory: input.workloadCategory,
        routingVersion: input.routingVersion,
      },
      this.configuration,
    );
    const id = input.id || `job-${this.jobs.size + 1}`;
    const job = {
      id,
      logicalId: input.logicalId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      priorityClass: input.priorityClass || WORKLOAD_DEFINITIONS[route.workloadCategory].defaultPriority,
      admissionClass: input.admissionClass || 'standard',
      tenantWeight: input.tenantWeight || 1,
      workspaceWeight: input.workspaceWeight || 1,
      createdAt: this.now(),
      status: 'queued',
      leaseEpoch: 0,
      ...route,
    };
    this.jobs.set(id, job);
    this.logicalJobs.set(logicalKey, id);
    if (!this.partitions.has(route.partitionKey)) {
      this.partitions.set(route.partitionKey, {
        partitionKey: route.partitionKey,
        workloadCategory: route.workloadCategory,
        routingVersion: route.routingVersion,
        partitionNumber: route.partitionNumber,
        status: 'active',
        ownershipEpoch: 0,
      });
    }
    return { ...job, idempotencyReplayed: false };
  }

  eligibleJobs(worker) {
    const candidates = [...this.jobs.values()].filter((job) =>
        job.status === 'queued' &&
        WORKLOAD_DEFINITIONS[job.workloadCategory].workerPool === worker.workerPool &&
        worker.supportedWorkloadCategories.includes(job.workloadCategory) &&
        worker.supportedRoutingVersions.includes(job.routingVersion));
    return fairSchedule(candidates, {
      now: this.now(),
      tenantServiceCounts: this.serviceCounts,
      tenantLastServedAt: this.lastServedAt,
    });
  }

  claim(workerId, leaseMs = 60_000) {
    const worker = this.workers.get(workerId);
    if (!worker || !['active', 'idle'].includes(worker.status)) return null;
    if (worker.activeClaimCount >= worker.maximumConcurrency) return null;
    for (const job of this.eligibleJobs(worker)) {
      const partition = this.partitions.get(job.partitionKey);
      if (!partition || ['paused', 'disabled'].includes(partition.status)) continue;
      const expired = !partition.leaseExpiresAt || new Date(partition.leaseExpiresAt).getTime() <= this.nowMs;
      if (partition.ownerWorkerId !== workerId && !expired) continue;
      if (partition.ownerWorkerId !== workerId || partition.ownerInstanceId !== worker.instanceId) {
        partition.ownerWorkerId = workerId;
        partition.ownerInstanceId = worker.instanceId;
        partition.ownershipEpoch += 1;
      }
      partition.heartbeatAt = this.now();
      partition.leaseExpiresAt = new Date(this.nowMs + leaseMs);
      job.status = 'running';
      job.leaseOwner = workerId;
      job.leaseEpoch += 1;
      job.partitionOwnershipEpoch = partition.ownershipEpoch;
      job.leaseExpiresAt = new Date(this.nowMs + leaseMs);
      job.claimedAt = this.now();
      const tenantKey = `${job.organizationId}\u0000${job.workspaceId}`;
      this.serviceCounts.set(tenantKey, Number(this.serviceCounts.get(tenantKey) || 0) + 1);
      this.lastServedAt.set(tenantKey, this.now());
      worker.activeClaimCount += 1;
      worker.status = 'active';
      return { job: { ...job }, workerId, instanceId: worker.instanceId, leaseEpoch: job.leaseEpoch, partitionOwnershipEpoch: job.partitionOwnershipEpoch };
    }
    return null;
  }

  heartbeat(claim, leaseMs = 60_000) {
    const job = this.jobs.get(claim.job.id);
    const partition = job && this.partitions.get(job.partitionKey);
    if (!job || job.status !== 'running' || job.leaseOwner !== claim.workerId || job.leaseEpoch !== claim.leaseEpoch || new Date(job.leaseExpiresAt).getTime() <= this.nowMs) {
      throw Object.assign(new Error('Worker lease is stale.'), { code: 'STALE_WORKER_LEASE' });
    }
    if (!partition || partition.ownerWorkerId !== claim.workerId || partition.ownershipEpoch !== claim.partitionOwnershipEpoch || new Date(partition.leaseExpiresAt).getTime() <= this.nowMs) {
      throw Object.assign(new Error('Partition owner is stale.'), { code: 'PARTITION_OWNERSHIP_LOST' });
    }
    job.leaseExpiresAt = new Date(this.nowMs + leaseMs);
    partition.leaseExpiresAt = new Date(this.nowMs + leaseMs);
    partition.heartbeatAt = this.now();
    return { ...job };
  }

  complete(claim, outcome = 'completed') {
    this.heartbeat(claim);
    const job = this.jobs.get(claim.job.id);
    const worker = this.workers.get(claim.workerId);
    job.status = outcome;
    job.completedAt = this.now();
    worker.activeClaimCount = Math.max(0, worker.activeClaimCount - 1);
    worker.status = worker.status === 'draining' ? 'draining' : worker.activeClaimCount ? 'active' : 'idle';
    this.completions.push({ logicalId: job.logicalId, outcome, workerId: claim.workerId, at: this.now() });
    return { ...job };
  }

  crash(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) worker.status = 'unhealthy';
    return worker && { ...worker };
  }

  recoverExpired() {
    let recovered = 0;
    for (const job of this.jobs.values()) {
      if (job.status !== 'running' || new Date(job.leaseExpiresAt).getTime() > this.nowMs) continue;
      const worker = this.workers.get(job.leaseOwner);
      if (worker) worker.activeClaimCount = Math.max(0, worker.activeClaimCount - 1);
      job.status = 'queued';
      delete job.leaseOwner;
      delete job.leaseExpiresAt;
      recovered += 1;
    }
    return recovered;
  }

  drain(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) return null;
    worker.status = 'draining';
    return { ...worker };
  }

  rebalance() {
    const workers = [...this.workers.values()].filter((worker) => ['active', 'idle'].includes(worker.status)).sort((a, b) => a.workerId.localeCompare(b.workerId));
    let changed = 0;
    for (const partition of this.partitions.values()) {
      const eligible = workers.filter((worker) => worker.supportedWorkloadCategories.includes(partition.workloadCategory) && worker.supportedRoutingVersions.includes(partition.routingVersion));
      if (!eligible.length) continue;
      const owner = eligible[Number(stableHashInteger(partition.partitionKey) % BigInt(eligible.length))];
      if (partition.ownerWorkerId === owner.workerId && partition.ownerInstanceId === owner.instanceId) continue;
      partition.ownerWorkerId = owner.workerId;
      partition.ownerInstanceId = owner.instanceId;
      partition.ownershipEpoch += 1;
      partition.leaseExpiresAt = new Date(this.nowMs + 60_000);
      changed += 1;
    }
    return changed;
  }

  admit(input) {
    const key = `${input.organizationId}:${input.workspaceId}:${input.idempotencyKey}`;
    if (this.reservations.has(key)) return { accepted: true, replayed: true, reservation: this.reservations.get(key) };
    const tenantKey = input.organizationId;
    const workspaceKey = `${input.organizationId}:${input.workspaceId}`;
    const tenantUsed = this.tenantSlots.get(tenantKey) || 0;
    const workspaceUsed = this.workspaceSlots.get(workspaceKey) || 0;
    if (tenantUsed >= input.tenantMaximum) return { accepted: false, code: 'TENANT_QUEUE_QUOTA_EXCEEDED' };
    if (workspaceUsed >= input.workspaceMaximum) return { accepted: false, code: 'WORKSPACE_QUEUE_QUOTA_EXCEEDED' };
    const reservation = { id: `reservation-${this.reservations.size + 1}`, organizationId: input.organizationId, workspaceId: input.workspaceId, status: 'reserved' };
    this.reservations.set(key, reservation);
    this.tenantSlots.set(tenantKey, tenantUsed + 1);
    this.workspaceSlots.set(workspaceKey, workspaceUsed + 1);
    return { accepted: true, replayed: false, reservation };
  }

  releaseAdmission(input) {
    const key = `${input.organizationId}:${input.workspaceId}:${input.idempotencyKey}`;
    const reservation = this.reservations.get(key);
    if (!reservation || reservation.status !== 'reserved') return false;
    reservation.status = 'released';
    this.tenantSlots.set(input.organizationId, Math.max(0, (this.tenantSlots.get(input.organizationId) || 0) - 1));
    const workspaceKey = `${input.organizationId}:${input.workspaceId}`;
    this.workspaceSlots.set(workspaceKey, Math.max(0, (this.workspaceSlots.get(workspaceKey) || 0) - 1));
    return true;
  }
}

module.exports = { DeterministicScaleHarness };
