const crypto = require('node:crypto');
const mongoose = require('mongoose');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { isDuplicateKeyError } = require('../utils/idempotency');

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function persistenceAvailable(options = {}) {
  return options.forcePersistence === true || mongoose.connection.readyState === 1;
}

async function claimScopeSlot({ workspaceId, scopeType, scopeId, limit, lease, now }) {
  for (let slotNumber = 1; slotNumber <= limit; slotNumber += 1) {
    try {
      const slot = await RuntimeCapacitySlot.findOneAndUpdate(
        {
          workspaceId,
          scopeType,
          scopeId,
          slotNumber,
          $or: [{ leaseExpiresAt: { $lte: now } }, { leaseId: lease.leaseId }],
        },
        {
          $set: {
            workspaceId,
            scopeType,
            scopeId,
            slotNumber,
            connectionId: lease.connectionId,
            invocationId: lease.invocationId,
            leaseId: lease.leaseId,
            acquiredAt: now,
            leaseExpiresAt: lease.leaseExpiresAt,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      if (slot) return slot;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return null;
}

async function releaseRuntimeCapacity(capacityLease, options = {}) {
  if (!capacityLease || capacityLease.bypassed || !persistenceAvailable(options))
    return { released: 0 };
  const result = await RuntimeCapacitySlot.deleteMany({
    workspaceId: capacityLease.workspaceId,
    leaseId: capacityLease.leaseId,
  });
  return { released: Number(result.deletedCount || 0) };
}

async function acquireRuntimeCapacity(connection, invocationId, options = {}) {
  if (!persistenceAvailable(options)) return { bypassed: true };
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const leaseId = options.leaseId || crypto.randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + env.RUNTIME_EXECUTION_LEASE_MS);
  const workspaceId = connection.receivingWorkspaceId;
  const connectionId = idOf(connection);
  const lease = { leaseId, invocationId, connectionId, leaseExpiresAt };
  const workspaceSlot = await claimScopeSlot({
    workspaceId,
    scopeType: 'workspace',
    scopeId: workspaceId,
    limit: env.RUNTIME_MAX_CONCURRENT_PER_WORKSPACE,
    lease,
    now,
  });
  if (!workspaceSlot) {
    throw new AppError(
      429,
      ErrorCodes.RUNTIME_CAPACITY_EXCEEDED,
      'Workspace runtime capacity is full.',
      [],
      {
        connectionId,
        retryAfterMs: Math.min(env.RUNTIME_EXECUTION_LEASE_MS, 1_000),
        reasonCode: 'WORKSPACE_CAPACITY_EXCEEDED',
      },
    );
  }
  const connectionSlot = await claimScopeSlot({
    workspaceId,
    scopeType: 'connection',
    scopeId: connectionId,
    limit: env.RUNTIME_MAX_CONCURRENT_PER_CONNECTION,
    lease,
    now,
  });
  if (!connectionSlot) {
    await RuntimeCapacitySlot.deleteMany({ workspaceId, leaseId });
    throw new AppError(
      429,
      ErrorCodes.RUNTIME_CAPACITY_EXCEEDED,
      'Connection runtime capacity is full.',
      [],
      {
        connectionId,
        retryAfterMs: Math.min(env.RUNTIME_EXECUTION_LEASE_MS, 1_000),
        reasonCode: 'CONNECTION_CAPACITY_EXCEEDED',
      },
    );
  }
  return { workspaceId, connectionId, invocationId, leaseId, leaseExpiresAt, bypassed: false };
}

async function renewRuntimeCapacity(capacityLease, options = {}) {
  if (!capacityLease || capacityLease.bypassed || !persistenceAvailable(options)) return null;
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const leaseDurationMs = Number(options.leaseDurationMs || env.RUNTIME_EXECUTION_LEASE_MS);
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  const result = await RuntimeCapacitySlot.updateMany(
    {
      workspaceId: capacityLease.workspaceId,
      invocationId: capacityLease.invocationId,
      leaseId: capacityLease.leaseId,
      leaseExpiresAt: { $gt: now },
    },
    { $set: { leaseExpiresAt } },
  );
  if (Number(result.matchedCount || 0) < 2) return null;
  capacityLease.leaseExpiresAt = leaseExpiresAt;
  return { ...capacityLease, leaseExpiresAt };
}

module.exports = { acquireRuntimeCapacity, releaseRuntimeCapacity, renewRuntimeCapacity };
