const mongoose = require('mongoose');
const PassportConnection = require('../models/PassportConnection');
const { classifyCircuitFailure } = require('../utils/circuitFailure');

const UNHEALTHY_FAILURE_THRESHOLD = 3;

function persistenceAvailable(options = {}) {
  return options.forcePersistence === true || mongoose.connection.readyState === 1;
}

function currentHealth(connection) {
  if (connection.healthStatus) return connection.healthStatus;
  if (connection.lastHealthStatus === 'healthy') return 'healthy';
  if (['unhealthy', 'unreachable'].includes(connection.lastHealthStatus)) return 'unhealthy';
  return 'unknown';
}

async function recordConnectionSuccess(connection, options = {}) {
  const from = currentHealth(connection);
  if (from === 'disabled' || !persistenceAvailable(options))
    return { changed: false, from, to: from };
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const updated = await PassportConnection.findOneAndUpdate(
    {
      _id: connection._id,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      healthStatus: { $ne: 'disabled' },
    },
    {
      $set: {
        healthStatus: 'healthy',
        lastHealthStatus: 'healthy',
        lastHealthCheckedAt: now,
        lastHealthSuccessAt: now,
        lastHealthTransitionAt: from === 'healthy' ? connection.lastHealthTransitionAt || now : now,
        lastHealthReasonCode: 'RUNTIME_SUCCESS',
        consecutiveHealthFailureCount: 0,
      },
    },
    { new: true, runValidators: true },
  );
  return {
    changed: Boolean(updated) && from !== 'healthy',
    from,
    to: updated?.healthStatus || from,
    connection: updated,
  };
}

async function recordConnectionFailure(connection, errorMetadata = {}, options = {}) {
  const classification = classifyCircuitFailure(errorMetadata);
  const from = currentHealth(connection);
  if (from === 'disabled' || !persistenceAvailable(options)) {
    return { changed: false, from, to: from, classification };
  }
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  if (!classification.countsTowardCircuit) {
    const updated = options.activeCheck
      ? await PassportConnection.findOneAndUpdate(
          {
            _id: connection._id,
            receivingWorkspaceId: connection.receivingWorkspaceId,
            healthStatus: { $ne: 'disabled' },
          },
          {
            $set: {
              lastHealthCheckedAt: now,
              lastHealthReasonCode: classification.reason,
            },
          },
          { new: true, runValidators: true },
        )
      : undefined;
    return { changed: false, from, to: updated?.healthStatus || from, classification };
  }
  const updated = await PassportConnection.findOneAndUpdate(
    {
      _id: connection._id,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      healthStatus: { $ne: 'disabled' },
    },
    [
      {
        $set: {
          consecutiveHealthFailureCount: {
            $add: [{ $ifNull: ['$consecutiveHealthFailureCount', 0] }, classification.weight],
          },
          lastHealthCheckedAt: now,
          lastHealthFailureAt: now,
          lastHealthReasonCode: classification.reason,
        },
      },
      {
        $set: {
          healthStatus: {
            $cond: [
              { $gte: ['$consecutiveHealthFailureCount', UNHEALTHY_FAILURE_THRESHOLD] },
              'unhealthy',
              'degraded',
            ],
          },
          lastHealthStatus: {
            $cond: [
              { $gte: ['$consecutiveHealthFailureCount', UNHEALTHY_FAILURE_THRESHOLD] },
              'unhealthy',
              'degraded',
            ],
          },
          lastHealthTransitionAt: now,
        },
      },
    ],
    { new: true },
  );
  const to = updated?.healthStatus || from;
  return {
    changed: Boolean(updated) && from !== to,
    from,
    to,
    classification,
    connection: updated,
  };
}

module.exports = {
  UNHEALTHY_FAILURE_THRESHOLD,
  currentHealth,
  recordConnectionFailure,
  recordConnectionSuccess,
};
