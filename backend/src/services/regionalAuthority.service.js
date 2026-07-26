const crypto = require('node:crypto');
const RegionalDeploymentConfiguration = require('../models/RegionalDeploymentConfiguration');
const RegionalWriteAuthority = require('../models/RegionalWriteAuthority');
const RegionalAuthorityTransition = require('../models/RegionalAuthorityTransition');
const RegionalServiceRegistration = require('../models/RegionalServiceRegistration');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const core = require('./regionalResilienceCore.service');
const metrics = require('./regionalResilienceMetrics.service');

function authorityKey(input = {}) {
  if (input.scope === 'platform') return 'platform';
  const organizationId = core.safeIdentifier(input.organizationId, 'organizationId');
  if (input.scope === 'organization' || !input.workspaceId) return `organization:${organizationId}`;
  return `organization:${organizationId}:workspace:${core.safeIdentifier(input.workspaceId, 'workspaceId')}`;
}

function authorityKeys(input = {}) {
  if (input.scope === 'platform') return ['platform'];
  const organizationId = core.safeIdentifier(input.organizationId, 'organizationId');
  return [
    ...(input.workspaceId
      ? [`organization:${organizationId}:workspace:${core.safeIdentifier(input.workspaceId, 'workspaceId')}`]
      : []),
    `organization:${organizationId}`,
    'platform',
  ];
}

function dependencies(overrides = {}) {
  return { RegionalDeploymentConfiguration, RegionalWriteAuthority, RegionalAuthorityTransition, RegionalServiceRegistration, ...overrides };
}

function runtimeContext(input = {}) {
  return {
    regionId: input.regionId || input.executionRegionId || env.SERVICE_REGION_ID,
    serviceId: input.serviceId || env.REGIONAL_SERVICE_ID,
    authorityEpoch: input.authorityEpoch,
    authorityLeaseEpoch: input.authorityLeaseEpoch,
  };
}

async function regionalModeEnabled(input, deps) {
  if (input.forceRegionalMode === true) return true;
  if (!env.MULTI_REGION_ENABLED) return false;
  const keys = authorityKeys(input);
  return Boolean(await deps.RegionalDeploymentConfiguration.exists({ scopeKey: { $in: keys }, status: 'active' }));
}

async function resolveAuthority(input, deps) {
  for (const key of authorityKeys(input)) {
    const record = await deps.RegionalWriteAuthority.findOne({ authorityKey: key }).lean();
    if (record) return record;
  }
  return null;
}

async function assertRegionalWriteAuthority(input = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  if (!(await regionalModeEnabled(input, deps))) return { enforced: false };
  let record;
  try {
    record = await resolveAuthority(input, deps);
  } catch (error) {
    throw new AppError(503, 'REGION_WRITE_FROZEN', 'Writes are frozen because durable authority cannot be verified.', [], { retryable: true, causeCategory: error?.name });
  }
  if (!record) throw new AppError(503, 'REGION_WRITE_FROZEN', 'No regional write authority is active.');
  const context = runtimeContext(input);
  if (record.status !== 'active') throw new AppError(409, record.status === 'transferring' ? 'REGION_FAILOVER_IN_PROGRESS' : 'REGION_WRITE_FROZEN', 'Regional writes are not active.');
  if (new Date(record.leaseExpiresAt).getTime() <= (options.now || new Date()).getTime()) throw new AppError(409, 'REGION_AUTHORITY_LEASE_EXPIRED', 'Regional write-authority lease expired.');
  if (record.activeRegionId !== context.regionId) { metrics.increment('regional_stale_writer_rejections', { safeReasonCode: 'REGION_NOT_WRITE_AUTHORITY' }); throw new AppError(409, 'REGION_NOT_WRITE_AUTHORITY', 'Region is not the active write authority.'); }
  if (context.authorityEpoch != null && Number(context.authorityEpoch) !== Number(record.authorityEpoch)) { metrics.increment('regional_stale_writer_rejections', { safeReasonCode: 'REGION_AUTHORITY_EPOCH_STALE' }); throw new AppError(409, 'REGION_AUTHORITY_EPOCH_STALE', 'Regional write-authority epoch is stale.'); }
  if (context.authorityLeaseEpoch != null && Number(context.authorityLeaseEpoch) !== Number(record.leaseEpoch)) throw new AppError(409, 'REGION_WRITE_FENCED', 'Regional authority lease epoch is stale.');
  return { enforced: true, authority: record, context: { ...context, authorityEpoch: record.authorityEpoch, authorityLeaseEpoch: record.leaseEpoch } };
}

async function acquireInitialAuthority(input = {}, options = {}) {
  core.assertNoSensitiveData(input);
  const deps = dependencies(options.dependencies);
  const now = options.now || new Date();
  const key = authorityKey(input);
  const regionId = core.safeIdentifier(input.regionId, 'regionId');
  const serviceId = core.safeIdentifier(input.serviceId, 'serviceId');
  const leaseDurationMs = core.boundedInteger(input.leaseDurationMs, 'leaseDurationMs', 5_000, 3_600_000, 60_000);
  const existing = await deps.RegionalWriteAuthority.findOne({ authorityKey: key });
  if (existing) {
    if (existing.activeRegionId === regionId && existing.leaseOwnerServiceId === serviceId && existing.status === 'active' && new Date(existing.leaseExpiresAt) > now) return existing;
    throw new AppError(409, new Date(existing.leaseExpiresAt) <= now ? 'REGION_AUTHORITY_LEASE_EXPIRED' : 'REGION_WRITE_AUTHORITY_CONFLICT', 'Write authority requires an explicit governed transfer.');
  }
  let record;
  try {
    record = await deps.RegionalWriteAuthority.create({
      authorityKey: key, scope: input.scope, organizationId: input.organizationId, workspaceId: input.workspaceId,
      activeRegionId: regionId, authorityEpoch: 1, status: 'active', leaseOwnerServiceId: serviceId,
      leaseId: input.leaseId || `lease-${crypto.randomUUID()}`, leaseEpoch: 1,
      leaseExpiresAt: new Date(now.getTime() + leaseDurationMs), heartbeatAt: now,
      lastTransitionId: input.transitionId || `transition-${crypto.randomUUID()}`, lastTransitionAt: now,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    throw new AppError(409, 'REGION_WRITE_AUTHORITY_CONFLICT', 'Write authority was acquired concurrently.');
  }
  await deps.RegionalAuthorityTransition.create({ transitionId: record.lastTransitionId, authorityKey: key, organizationId: input.organizationId, workspaceId: input.workspaceId, targetRegionId: regionId, sourceAuthorityEpoch: 0, targetAuthorityEpoch: 1, transitionType: 'acquire', status: 'committed', safeReasonCodes: ['REGION_AUTHORITY_ACQUIRED'], requestedBy: input.requestedBy || serviceId, requestId: input.requestId, traceId: input.traceId, committedAt: now });
  metrics.increment('regional_authority_transitions', { outcome: 'acquired' });
  return record;
}

async function renewAuthority(input = {}, options = {}) {
  const deps = dependencies(options.dependencies); const now = options.now || new Date(); const key = authorityKey(input);
  const leaseDurationMs = core.boundedInteger(input.leaseDurationMs, 'leaseDurationMs', 5_000, 3_600_000, 60_000);
  const record = await deps.RegionalWriteAuthority.findOneAndUpdate(
    { authorityKey: key, activeRegionId: input.regionId, authorityEpoch: Number(input.authorityEpoch), leaseOwnerServiceId: input.serviceId, leaseEpoch: Number(input.leaseEpoch), leaseId: input.leaseId, status: 'active', leaseExpiresAt: { $gt: now } },
    { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + leaseDurationMs) } },
    { new: true, runValidators: true },
  );
  if (!record) throw new AppError(409, 'REGION_WRITE_FENCED', 'Regional write-authority renewal was fenced.');
  return record;
}

async function freezeAuthority(input = {}, options = {}) {
  const deps = dependencies(options.dependencies); const now = options.now || new Date(); const key = authorityKey(input);
  const record = await deps.RegionalWriteAuthority.findOneAndUpdate(
    { authorityKey: key, authorityEpoch: Number(input.authorityEpoch), activeRegionId: input.regionId, status: 'active' },
    { $set: { status: 'frozen', lastTransitionAt: now, leaseExpiresAt: now } },
    { new: true, runValidators: true },
  );
  if (!record) throw new AppError(409, 'REGION_AUTHORITY_EPOCH_STALE', 'Regional authority freeze was fenced.');
  return record;
}

async function transferAuthority(input = {}, options = {}) {
  core.assertNoSensitiveData(input);
  if (input.sourceFenced !== true || input.authorityStoreReachable !== true) throw new AppError(409, 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE', 'Authority transfer requires proven source fencing and a reachable durable authority store.', [], { interventionRequired: true });
  const deps = dependencies(options.dependencies); const now = options.now || new Date(); const key = authorityKey(input);
  const sourceEpoch = Number(input.sourceAuthorityEpoch);
  if (!Number.isSafeInteger(sourceEpoch) || sourceEpoch < 1) throw new AppError(400, 'REGION_AUTHORITY_EPOCH_INVALID', 'Source authority epoch is invalid.');
  const targetEpoch = sourceEpoch + 1;
  const transitionId = input.transitionId || `transition-${crypto.randomUUID()}`;
  const leaseDurationMs = core.boundedInteger(input.leaseDurationMs, 'leaseDurationMs', 5_000, 3_600_000, 60_000);
  const record = await deps.RegionalWriteAuthority.findOneAndUpdate(
    { authorityKey: key, activeRegionId: input.sourceRegionId, authorityEpoch: sourceEpoch, status: { $in: ['active', 'frozen', 'isolated', 'transferring'] }, lastTransitionId: { $ne: transitionId } },
    { $set: { activeRegionId: input.targetRegionId, authorityEpoch: targetEpoch, status: 'active', leaseOwnerServiceId: input.targetServiceId, leaseId: input.leaseId || `lease-${crypto.randomUUID()}`, leaseExpiresAt: new Date(now.getTime() + leaseDurationMs), heartbeatAt: now, lastTransitionId: transitionId, lastTransitionAt: now }, $inc: { leaseEpoch: 1 } },
    { new: true, runValidators: true },
  );
  if (!record) {
    const replay = await deps.RegionalWriteAuthority.findOne({ authorityKey: key, lastTransitionId: transitionId, activeRegionId: input.targetRegionId, authorityEpoch: targetEpoch });
    if (replay) return replay;
    throw new AppError(409, 'REGION_AUTHORITY_EPOCH_STALE', 'Regional authority transfer was fenced by a newer epoch.');
  }
  try {
    await deps.RegionalAuthorityTransition.create({ transitionId, authorityKey: key, organizationId: input.organizationId, workspaceId: input.workspaceId, sourceRegionId: input.sourceRegionId, targetRegionId: input.targetRegionId, sourceAuthorityEpoch: sourceEpoch, targetAuthorityEpoch: targetEpoch, transitionType: input.transitionType === 'failback' ? 'failback' : 'transfer', status: 'committed', safeReasonCodes: ['REGION_SOURCE_FENCED', 'REGION_AUTHORITY_TRANSFERRED'], failoverPlanId: input.failoverPlanId, requestedBy: input.requestedBy || input.targetServiceId, requestId: input.requestId, traceId: input.traceId, committedAt: now });
  } catch (error) { if (error?.code !== 11000) throw error; }
  metrics.increment('regional_authority_transitions', { outcome: input.transitionType === 'failback' ? 'failback' : 'transferred' });
  return record;
}

async function registerRegionalService(input = {}, options = {}) {
  core.assertNoSensitiveData(input); const deps = dependencies(options.dependencies); const now = options.now || new Date();
  const serviceId = core.safeIdentifier(input.serviceId, 'serviceId'); const instanceId = core.safeIdentifier(input.instanceId, 'instanceId'); const regionId = core.safeIdentifier(input.regionId, 'regionId');
  const record = await deps.RegionalServiceRegistration.findOneAndUpdate(
    { serviceId, instanceId },
    { $set: { regionId, serviceType: input.serviceType, supportedWorkloadCategories: input.supportedWorkloadCategories || [], supportedRoutingVersions: input.supportedRoutingVersions || [1], softwareVersion: input.softwareVersion, protocolVersion: input.protocolVersion || '1', state: input.state || 'active', writeAuthorityEpoch: Number(input.writeAuthorityEpoch || 0), currentAuthorityLeaseId: input.currentAuthorityLeaseId, maximumConcurrency: Number(input.maximumConcurrency || 0), activeClaimCount: Number(input.activeClaimCount || 0), safeZone: input.safeZone, safeDeploymentCategory: input.safeDeploymentCategory, heartbeatAt: now, lastReadyAt: ['active', 'idle'].includes(input.state || 'active') ? now : undefined }, $setOnInsert: { startedAt: input.startedAt || now } },
    { upsert: true, new: true, runValidators: true },
  );
  return record;
}

module.exports = { acquireInitialAuthority, assertRegionalWriteAuthority, authorityKey, authorityKeys, freezeAuthority, registerRegionalService, renewAuthority, transferAuthority };
