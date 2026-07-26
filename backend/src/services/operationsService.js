const AgentPassport = require('../models/AgentPassport');
const AuditLog = require('../models/AuditLog');
const Invocation = require('../models/Invocation');
const OperationalAlert = require('../models/OperationalAlert');
const PassportConnection = require('../models/PassportConnection');
const PassportInstallKey = require('../models/PassportInstallKey');
const CircuitBreaker = require('../models/CircuitBreaker');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const DurableEventOutbox = require('../models/DurableEventOutbox');
const mongoose = require('mongoose');
const { databaseStatus } = require('../config/db');
const { env } = require('../config/env');
const { runtimeConfigurationStatus } = require('../controllers/healthController');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  OPERATION_WINDOWS,
  OPERATION_STAGE_NAMES,
  MAX_LATENCY_SAMPLE_SIZE,
} = require('../constants/operations');
const packageMetadata = require('../../package.json');
const { serviceLifecycle } = require('./serviceLifecycle.service');
const durableWork = require('./durableWork.service');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');

const ALERT_WINDOW = '24h';
const SAFE_HEALTH_STATUSES = new Set([
  'unknown',
  'healthy',
  'degraded',
  'unhealthy',
  'disabled',
  'unreachable',
]);
const SAFE_ALERT_STATUSES = new Set(['active', 'acknowledged', 'resolved']);
const IN_PROGRESS_LIFECYCLE_STATES = [
  'accepted',
  'validating',
  'authorized',
  'running',
  'waiting_for_runtime',
];
const PROBLEM_LIFECYCLE_STATES = ['failed', 'timed_out', 'recovery_required'];

function effectiveLifecycleExpression() {
  return {
    $ifNull: [
      '$lifecycleState',
      {
        $switch: {
          branches: [
            { case: { $eq: ['$status', 'completed'] }, then: 'succeeded' },
            { case: { $eq: ['$status', 'running'] }, then: 'running' },
            { case: { $eq: ['$status', 'failed'] }, then: 'failed' },
          ],
          default: 'accepted',
        },
      },
    ],
  };
}

function successfulInvocationFilter() {
  return {
    $or: [
      { lifecycleState: 'succeeded' },
      { lifecycleState: { $exists: false }, status: 'completed' },
    ],
  };
}

function problemInvocationFilter(extra = {}) {
  return {
    ...extra,
    $or: [
      { lifecycleState: { $in: PROBLEM_LIFECYCLE_STATES } },
      { lifecycleState: { $exists: false }, status: 'failed' },
    ],
  };
}

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
    { path, message },
  ]);
}

function requireIdentity(input) {
  const receivingWorkspaceId = String(input?.receivingWorkspaceId || '').trim();
  const receivingUserId = String(input?.receivingUserId || '').trim();
  if (!receivingWorkspaceId || !receivingUserId) {
    throw validationError(
      !receivingWorkspaceId ? 'receivingWorkspaceId' : 'receivingUserId',
      `${!receivingWorkspaceId ? 'receivingWorkspaceId' : 'receivingUserId'} is required.`,
    );
  }
  return { receivingWorkspaceId, receivingUserId };
}

function parseWindow(value = '24h', now = new Date()) {
  const key = String(value || '24h');
  const durationMs = OPERATION_WINDOWS[key];
  if (!durationMs) {
    throw validationError(
      'window',
      `window must be one of: ${Object.keys(OPERATION_WINDOWS).join(', ')}.`,
    );
  }
  const until = new Date(now);
  return {
    key,
    since: new Date(until.getTime() - durationMs),
    until,
    durationMs,
    hours: durationMs / (60 * 60 * 1000),
  };
}

function pageFromInput(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1)
    throw validationError('page', 'page must be a positive integer.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationError('limit', 'limit must be an integer between 1 and 100.');
  }
  return { page, limit, skip: (page - 1) * limit };
}

function round(value, places = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function rate(numerator, denominator) {
  return denominator > 0 ? round((numerator / denominator) * 100) : 0;
}

function percentile(sortedValues, target) {
  if (!sortedValues.length) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * target;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  return round(
    sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower),
  );
}

function latencyStatistics(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return {
      count: 0,
      averageMs: null,
      minMs: null,
      maxMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
    };
  }
  return {
    count: sorted.length,
    averageMs: round(sorted.reduce((total, value) => total + value, 0) / sorted.length),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
  };
}

function windowView(window) {
  return { key: window.key, from: window.since, to: window.until };
}

function partnerIdFrom(actor = {}) {
  return actor?.partner?._id || actor?.partnerId;
}

async function connectionIdsForWorkspace(receivingWorkspaceId, partnerId) {
  return PassportConnection.distinct('_id', {
    receivingWorkspaceId,
    ...(partnerId ? { partnerId } : {}),
  });
}

function connectionMatch(receivingWorkspaceId, connectionIds) {
  return {
    receivingWorkspaceId,
    ...(Array.isArray(connectionIds) ? { _id: { $in: connectionIds } } : {}),
  };
}

function ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds) {
  const ownedIds = Array.isArray(connectionIds) ? connectionIds.map(String) : null;
  return {
    'metadata.receivingWorkspaceId': receivingWorkspaceId,
    ...(ownedIds
      ? {
          $or: [
            { 'metadata.connectionId': { $in: ownedIds } },
            { entityType: 'PassportConnection', entityId: { $in: ownedIds } },
          ],
        }
      : {}),
  };
}

function invocationMatch(receivingWorkspaceId, connectionIds, since, extra = {}) {
  return {
    $and: [
      {
        receivingWorkspaceId,
        ...(Array.isArray(connectionIds) ? { connectionId: { $in: connectionIds } } : {}),
      },
      { createdAt: { $gte: since } },
      extra,
    ],
  };
}

async function invocationSummary(receivingWorkspaceId, connectionIds, window) {
  const [[result = { totals: [], runtimes: [] }], manualRetryAllowed, recoveryRetryDenied] =
    await Promise.all([
      Invocation.aggregate([
        { $match: invocationMatch(receivingWorkspaceId, connectionIds, window.since) },
        { $set: { effectiveLifecycleState: effectiveLifecycleExpression() } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  successful: {
                    $sum: { $cond: [{ $eq: ['$effectiveLifecycleState', 'succeeded'] }, 1, 0] },
                  },
                  failed: {
                    $sum: { $cond: [{ $eq: ['$effectiveLifecycleState', 'failed'] }, 1, 0] },
                  },
                  timedOut: {
                    $sum: { $cond: [{ $eq: ['$effectiveLifecycleState', 'timed_out'] }, 1, 0] },
                  },
                  cancelled: {
                    $sum: { $cond: [{ $eq: ['$effectiveLifecycleState', 'cancelled'] }, 1, 0] },
                  },
                  recoveryRequired: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$effectiveLifecycleState', 'recovery_required'] },
                            { $ne: ['$recoveryState', 'resolved'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  inProgress: {
                    $sum: {
                      $cond: [
                        { $in: ['$effectiveLifecycleState', IN_PROGRESS_LIFECYCLE_STATES] },
                        1,
                        0,
                      ],
                    },
                  },
                  running: {
                    $sum: {
                      $cond: [
                        { $in: ['$effectiveLifecycleState', ['running', 'waiting_for_runtime']] },
                        1,
                        0,
                      ],
                    },
                  },
                  queued: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            '$effectiveLifecycleState',
                            ['accepted', 'validating', 'authorized'],
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  retryableFailures: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $in: ['$effectiveLifecycleState', PROBLEM_LIFECYCLE_STATES] },
                            { $eq: ['$error.retryable', true] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  totalAttempts: { $sum: { $ifNull: ['$attemptCount', 0] } },
                  additionalAttempts: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $ifNull: ['$attemptCount', 0] }, 1] },
                        { $subtract: [{ $ifNull: ['$attemptCount', 0] }, 1] },
                        0,
                      ],
                    },
                  },
                  retriedInvocations: {
                    $sum: { $cond: [{ $gt: [{ $ifNull: ['$attemptCount', 0] }, 1] }, 1, 0] },
                  },
                  repeatedTransientFailures: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gt: [{ $ifNull: ['$attemptCount', 0] }, 1] },
                            { $eq: ['$error.retryable', true] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  retryAllowed: {
                    $sum: { $cond: [{ $eq: ['$retryState', 'scheduled'] }, 1, 0] },
                  },
                  retryDenied: {
                    $sum: {
                      $cond: [{ $in: ['$retryState', ['not_allowed', 'exhausted']] }, 1, 0],
                    },
                  },
                  cancellationRequested: {
                    $sum: {
                      $cond: [{ $ne: [{ $ifNull: ['$cancelRequestedAt', null] }, null] }, 1, 0],
                    },
                  },
                  cancellationConfirmed: {
                    $sum: { $cond: [{ $eq: ['$cancellationState', 'confirmed'] }, 1, 0] },
                  },
                  cancellationOutcomeUnknown: {
                    $sum: { $cond: [{ $eq: ['$cancellationState', 'outcome_unknown'] }, 1, 0] },
                  },
                  stuckDetected: {
                    $sum: {
                      $cond: [{ $ne: [{ $ifNull: ['$stuckDetectedAt', null] }, null] }, 1, 0],
                    },
                  },
                  manuallyResolved: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$recoveryState', 'resolved'] },
                            {
                              $in: [
                                '$recoveryDecision',
                                ['resolve_as_failed_allowed', 'resolve_as_cancelled_allowed'],
                              ],
                            },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            runtimes: [
              { $group: { _id: '$runtimeType', count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
      AuditLog.countDocuments({
        ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
        action: 'invocation.recovery.retry_allowed',
        createdAt: { $gte: window.since },
      }),
      AuditLog.countDocuments({
        ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
        action: 'invocation.recovery.retry_denied',
        createdAt: { $gte: window.since },
      }),
    ]);
  const totals = result.totals?.[0] || {};
  const problemCount =
    (totals.failed || 0) + (totals.timedOut || 0) + (totals.recoveryRequired || 0);
  return {
    total: totals.total || 0,
    successful: totals.successful || 0,
    failed: totals.failed || 0,
    timedOut: totals.timedOut || 0,
    cancelled: totals.cancelled || 0,
    recoveryRequired: totals.recoveryRequired || 0,
    inProgress: totals.inProgress || 0,
    running: totals.running || 0,
    queued: totals.queued || 0,
    retryableFailures: totals.retryableFailures || 0,
    nonRetryableFailures: Math.max(0, problemCount - (totals.retryableFailures || 0)),
    successRatePercent: rate(totals.successful || 0, totals.total || 0),
    failureRatePercent: rate(problemCount, totals.total || 0),
    ratePerHour: round((totals.total || 0) / window.hours),
    byRuntime: Object.fromEntries(
      (result.runtimes || []).map((item) => [item._id || 'unknown', item.count]),
    ),
    attempts: {
      total: totals.totalAttempts || 0,
      additional: totals.additionalAttempts || 0,
      retriedInvocations: totals.retriedInvocations || 0,
      repeatedTransientFailures: totals.repeatedTransientFailures || 0,
      retryAllowed: totals.retryAllowed || 0,
      retryDenied: totals.retryDenied || 0,
    },
    controls: {
      cancellationRequested: totals.cancellationRequested || 0,
      cancellationConfirmed: totals.cancellationConfirmed || 0,
      cancellationOutcomeUnknown: totals.cancellationOutcomeUnknown || 0,
      stuckDetected: totals.stuckDetected || 0,
      recoveryRequired: totals.recoveryRequired || 0,
      manuallyRetried: manualRetryAllowed || 0,
      manuallyResolved: totals.manuallyResolved || 0,
      retryDenied: recoveryRetryDenied || 0,
    },
  };
}

async function invocationControlSummary(receivingWorkspaceId, connectionIds, window) {
  const [[row = {}], manuallyRetried, retryDenied] = await Promise.all([
    Invocation.aggregate([
      {
        $match: {
          receivingWorkspaceId,
          ...(Array.isArray(connectionIds) ? { connectionId: { $in: connectionIds } } : {}),
        },
      },
      {
        $group: {
          _id: null,
          cancellationRequested: {
            $sum: { $cond: [{ $gte: ['$cancelRequestedAt', window.since] }, 1, 0] },
          },
          cancellationConfirmed: {
            $sum: { $cond: [{ $gte: ['$cancellationConfirmedAt', window.since] }, 1, 0] },
          },
          cancellationOutcomeUnknown: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$cancellationState', 'outcome_unknown'] },
                    { $gte: ['$cancelRequestedAt', window.since] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          stuckDetected: {
            $sum: { $cond: [{ $gte: ['$stuckDetectedAt', window.since] }, 1, 0] },
          },
          recoveryRequired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$lifecycleState', 'recovery_required'] },
                    { $ne: ['$recoveryState', 'resolved'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          manuallyResolved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recoveryState', 'resolved'] },
                    {
                      $in: [
                        '$recoveryDecision',
                        ['resolve_as_failed_allowed', 'resolve_as_cancelled_allowed'],
                      ],
                    },
                    { $gte: ['$recoveryCompletedAt', window.since] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    AuditLog.countDocuments({
      ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
      action: 'invocation.recovery.retry_allowed',
      createdAt: { $gte: window.since },
    }),
    AuditLog.countDocuments({
      ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
      action: 'invocation.recovery.retry_denied',
      createdAt: { $gte: window.since },
    }),
  ]);
  return {
    cancellationRequested: row.cancellationRequested || 0,
    cancellationConfirmed: row.cancellationConfirmed || 0,
    cancellationOutcomeUnknown: row.cancellationOutcomeUnknown || 0,
    stuckDetected: row.stuckDetected || 0,
    recoveryRequired: row.recoveryRequired || 0,
    manuallyRetried: manuallyRetried || 0,
    manuallyResolved: row.manuallyResolved || 0,
    retryDenied: retryDenied || 0,
  };
}

function safeFailure(invocation) {
  const lifecycleState =
    invocation.lifecycleState || (invocation.status === 'failed' ? 'failed' : invocation.status);
  const retryDecision =
    invocation.retryState === 'scheduled'
      ? 'allowed'
      : ['not_allowed', 'exhausted'].includes(invocation.retryState)
        ? 'denied'
        : 'not_evaluated';
  return {
    invocationId: String(invocation._id || invocation.id),
    connectionId: String(invocation.connectionId || ''),
    runtimeType: invocation.runtimeType || 'unknown',
    status: lifecycleState || 'failed',
    attemptCount: Number.isInteger(invocation.attemptCount) ? invocation.attemptCount : 0,
    retryDecision,
    retryReason: invocation.retryDecisionReason || null,
    durationMs: Number.isFinite(invocation.durationMs) ? invocation.durationMs : null,
    errorCode: invocation.error?.code || 'UNKNOWN',
    stage: OPERATION_STAGE_NAMES.includes(invocation.error?.stage)
      ? invocation.error.stage
      : 'unknown',
    retryable: invocation.error?.retryable === true,
    providerHttpStatus: Number.isInteger(invocation.error?.providerHttpStatus)
      ? invocation.error.providerHttpStatus
      : null,
    traceId: invocation.traceId || null,
    createdAt: invocation.createdAt,
  };
}

function errorCategory(errorCode, providerHttpStatus) {
  const code = String(errorCode || 'UNKNOWN').toUpperCase();
  if (/TIMEOUT|ETIMEDOUT/.test(code) || [504].includes(providerHttpStatus)) return 'timeout';
  if (/AUTHENTICATION|CREDENTIAL|UNAUTHORIZED/.test(code) || providerHttpStatus === 401)
    return 'authentication';
  if (/FORBIDDEN|POLICY/.test(code) || providerHttpStatus === 403) return 'policy_denial';
  if (/SCHEMA|INPUT_INVALID|OUTPUT_INVALID|VALIDATION/.test(code)) return 'schema_validation';
  if (providerHttpStatus === 429 || /RATE_LIMIT/.test(code)) return 'provider_rate_limited';
  if ([502, 503].includes(providerHttpStatus) || /UNAVAILABLE|SAFE_FETCH_FAILED/.test(code))
    return 'provider_unavailable';
  if (/SOURCE|VERIFICATION/.test(code)) return 'source_verification';
  if (/UNSAFE_URL|SSRF/.test(code)) return 'unsafe_url';
  if (/MONGO|DATABASE/.test(code)) return 'database';
  if (/INSTALL_KEY/.test(code)) return 'install_key';
  return 'runtime';
}

async function recentFailures(receivingWorkspaceId, connectionIds, window, limit = 10) {
  const rows = await Invocation.find(
    invocationMatch(receivingWorkspaceId, connectionIds, window.since, problemInvocationFilter()),
  )
    .select(
      '_id connectionId runtimeType status lifecycleState attemptCount retryState retryDecisionReason durationMs traceId error.code error.stage error.retryable error.providerHttpStatus createdAt',
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map(safeFailure);
}

async function connectionSummary(receivingWorkspaceId, window, connectionIds = []) {
  const scopedConnections = connectionMatch(receivingWorkspaceId, connectionIds);
  const [[counts = {}], healthFailures] = await Promise.all([
    PassportConnection.aggregate([
      { $match: scopedConnections },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] } },
          pendingAuth: { $sum: { $cond: [{ $eq: ['$status', 'pending_auth'] }, 1, 0] } },
          disconnected: { $sum: { $cond: [{ $eq: ['$status', 'disconnected'] }, 1, 0] } },
          error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          healthy: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'connected'] },
                    {
                      $eq: [{ $ifNull: ['$healthStatus', '$lastHealthStatus'] }, 'healthy'],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unhealthy: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'connected'] },
                    {
                      $in: [
                        { $ifNull: ['$healthStatus', '$lastHealthStatus'] },
                        ['unhealthy', 'unreachable'],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          degraded: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'connected'] },
                    {
                      $eq: [{ $ifNull: ['$healthStatus', '$lastHealthStatus'] }, 'degraded'],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    AuditLog.countDocuments({
      ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
      action: 'connection.health_checked',
      'metadata.result': { $in: ['unhealthy', 'unreachable'] },
      ...(window ? { createdAt: { $gte: window.since } } : {}),
    }),
  ]);
  const items = await PassportConnection.find({ ...scopedConnections, status: 'connected' })
    .select(
      '_id status runtimeType healthStatus lastHealthStatus lastHealthCheckedAt resolvedPassportSnapshot.agent.name updatedAt',
    )
    .sort({ lastHealthCheckedAt: -1, updatedAt: -1 })
    .limit(12)
    .lean();
  const itemIds = items.map((item) => item._id);
  const failureRows = itemIds.length
    ? await Invocation.aggregate([
        {
          $match: invocationMatch(receivingWorkspaceId, connectionIds, window.since, {
            connectionId: { $in: itemIds },
            ...problemInvocationFilter(),
          }),
        },
        { $group: { _id: '$connectionId', count: { $sum: 1 } } },
      ])
    : [];
  const failuresByConnection = new Map(failureRows.map((row) => [String(row._id), row.count]));
  const active = counts.active || 0;
  const healthy = counts.healthy || 0;
  const unhealthy = counts.unhealthy || 0;
  const degraded = counts.degraded || 0;
  return {
    total: counts.total || 0,
    active,
    pendingAuth: counts.pendingAuth || 0,
    disconnected: counts.disconnected || 0,
    error: counts.error || 0,
    healthCheckFailures: healthFailures,
    health: {
      healthy,
      degraded,
      unhealthy,
      unknown: Math.max(0, active - healthy - degraded - unhealthy),
    },
    items: items.map((item) => ({
      connectionId: String(item._id),
      agentName: item.resolvedPassportSnapshot?.agent?.name || 'Unnamed agent',
      runtimeType: item.runtimeType,
      status: item.status,
      healthStatus: SAFE_HEALTH_STATUSES.has(item.healthStatus || item.lastHealthStatus)
        ? item.healthStatus || item.lastHealthStatus
        : 'unknown',
      checkedAt: item.lastHealthCheckedAt || null,
      recentFailureCount: failuresByConnection.get(String(item._id)) || 0,
    })),
  };
}

async function reliabilitySummary(receivingWorkspaceId, window, connectionIds) {
  const lifecycle = serviceLifecycle.snapshot();
  if (mongoose.connection.readyState !== 1) {
    return {
      circuits: { open: 0, halfOpen: 0 },
      rateLimitedConnections: 0,
      capacity: { activeInvocations: 0, activeSlots: 0, rejections: 0 },
      service: { phase: lifecycle.phase, draining: lifecycle.draining },
    };
  }
  const now = new Date();
  const [circuitRows, rateLimitedConnections, capacityRows, capacityRejections] = await Promise.all(
    [
      CircuitBreaker.aggregate([
        {
          $match: {
            workspaceId: receivingWorkspaceId,
            ...(Array.isArray(connectionIds) ? { connectionId: { $in: connectionIds } } : {}),
            state: { $in: ['open', 'half_open'] },
          },
        },
        { $group: { _id: '$state', count: { $sum: 1 } } },
      ]),
      CircuitBreaker.distinct('connectionId', {
        workspaceId: receivingWorkspaceId,
        ...(Array.isArray(connectionIds) ? { connectionId: { $in: connectionIds } } : {}),
        rateLimitedUntil: { $gt: now },
      }).then((ids) => ids.length),
      RuntimeCapacitySlot.aggregate([
        {
          $match: {
            workspaceId: receivingWorkspaceId,
            ...(Array.isArray(connectionIds) ? { connectionId: { $in: connectionIds } } : {}),
            leaseExpiresAt: { $gt: now },
          },
        },
        { $group: { _id: '$leaseId', slots: { $sum: 1 } } },
        { $group: { _id: null, activeInvocations: { $sum: 1 }, activeSlots: { $sum: '$slots' } } },
      ]),
      AuditLog.countDocuments({
        ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
        action: 'capacity.rejected',
        ...(window ? { createdAt: { $gte: window.since } } : {}),
      }),
    ],
  );
  const circuitCounts = Object.fromEntries(circuitRows.map((row) => [row._id, row.count]));
  return {
    circuits: { open: circuitCounts.open || 0, halfOpen: circuitCounts.half_open || 0 },
    rateLimitedConnections,
    capacity: {
      activeInvocations: capacityRows[0]?.activeInvocations || 0,
      activeSlots: capacityRows[0]?.activeSlots || 0,
      rejections: capacityRejections,
    },
    service: { phase: lifecycle.phase, draining: lifecycle.draining },
  };
}

async function passportSummary(receivingWorkspaceId, window, connectionIds) {
  const [counts = {}] = await PassportConnection.aggregate([
    { $match: connectionMatch(receivingWorkspaceId, connectionIds) },
    { $group: { _id: '$passportId' } },
    {
      $lookup: {
        from: AgentPassport.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'passport',
      },
    },
    { $unwind: { path: '$passport', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        valid: { $sum: { $cond: [{ $eq: ['$passport.status', 'valid'] }, 1, 0] } },
        invalid: { $sum: { $cond: [{ $eq: ['$passport.status', 'invalid'] }, 1, 0] } },
        suspended: { $sum: { $cond: [{ $eq: ['$passport.status', 'suspended'] }, 1, 0] } },
        draft: { $sum: { $cond: [{ $eq: ['$passport.status', 'draft'] }, 1, 0] } },
        updatedDuringWindow: {
          $sum: {
            $cond: [{ $gte: ['$passport.updatedAt', window.since] }, 1, 0],
          },
        },
      },
    },
  ]);
  const total = counts.total || 0;
  const known =
    (counts.valid || 0) + (counts.invalid || 0) + (counts.suspended || 0) + (counts.draft || 0);
  return {
    total,
    valid: counts.valid || 0,
    active: counts.valid || 0,
    invalid: counts.invalid || 0,
    suspended: counts.suspended || 0,
    draft: counts.draft || 0,
    unknown: Math.max(0, total - known),
    updatedDuringWindow: counts.updatedDuringWindow || 0,
  };
}

async function installationFunnel(receivingWorkspaceId, connectionIds, window, partnerId) {
  const partnerInstallKeyIds = partnerId
    ? (await PassportInstallKey.distinct('_id', { partnerId })).map(String)
    : null;
  const [resolvedKeys, [connectionCounts = {}], firstSuccessRows, auditRows] = await Promise.all([
    PassportInstallKey.countDocuments({
      usedByWorkspaceId: receivingWorkspaceId,
      ...(partnerId ? { partnerId } : {}),
      status: 'used',
      usedAt: { $gte: window.since },
    }),
    PassportConnection.aggregate([
      {
        $match: {
          ...connectionMatch(receivingWorkspaceId, connectionIds),
          createdAt: { $gte: window.since },
        },
      },
      {
        $group: {
          _id: null,
          connectionsCreated: { $sum: 1 },
          passportsValidated: {
            $sum: {
              $cond: [{ $ne: [{ $type: '$resolvedPassportSnapshot.agent.id' }, 'missing'] }, 1, 0],
            },
          },
          capabilityMetadataImported: {
            $sum: {
              $cond: [
                {
                  $gt: [{ $size: { $ifNull: ['$resolvedPassportSnapshot.capabilities', []] } }, 0],
                },
                1,
                0,
              ],
            },
          },
          runtimeResolved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$runtimeType', ['rest', 'mcp']] },
                    { $gt: [{ $strLenCP: { $ifNull: ['$runtimeEndpoint', ''] } }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          delegatedApplicable: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    '$resolvedPassportSnapshot.installation.installMode',
                    'delegated_runtime_access',
                  ],
                },
                1,
                0,
              ],
            },
          },
          delegatedCredentialConfigured: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        '$resolvedPassportSnapshot.installation.installMode',
                        'delegated_runtime_access',
                      ],
                    },
                    { $ne: [{ $type: '$credentialId' }, 'missing'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          connectionsVerified: { $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] } },
        },
      },
    ]),
    Invocation.aggregate([
      {
        $match: invocationMatch(receivingWorkspaceId, connectionIds, window.since, {
          ...successfulInvocationFilter(),
        }),
      },
      { $group: { _id: '$connectionId' } },
      { $count: 'count' },
    ]),
    AuditLog.aggregate([
      {
        $match: {
          'metadata.receivingWorkspaceId': receivingWorkspaceId,
          entityType: 'PassportInstallKey',
          ...(partnerInstallKeyIds ? { entityId: { $in: partnerInstallKeyIds } } : {}),
          action: 'install_key.resolve_denied',
          createdAt: { $gte: window.since },
        },
      },
      { $group: { _id: '$metadata.reason', count: { $sum: 1 } } },
    ]),
  ]);
  const denialCounts = Object.fromEntries(
    auditRows.map((row) => [row._id || 'unknown', row.count]),
  );
  const resolutionFailures = auditRows.reduce((sum, row) => sum + row.count, 0);
  const attempts = resolvedKeys + resolutionFailures;
  const created = connectionCounts.connectionsCreated || 0;
  const steps = [
    ['keysResolved', resolvedKeys],
    ['passportsValidated', connectionCounts.passportsValidated || 0],
    ['capabilityMetadataImported', connectionCounts.capabilityMetadataImported || 0],
    ['runtimeResolved', connectionCounts.runtimeResolved || 0],
    ['delegatedCredentialConfigured', connectionCounts.delegatedCredentialConfigured || 0],
    ['connectionsCreated', created],
    ['connectionsVerified', connectionCounts.connectionsVerified || 0],
    ['firstSuccessfulInvocation', firstSuccessRows[0]?.count || 0],
  ].map(([key, count]) => ({ key, count }));
  return {
    steps,
    totals: {
      resolutionAttempts: attempts,
      resolutionFailures,
      resolutionSuccessRatePercent: rate(resolvedKeys, attempts),
      reusedKeyRejections: denialCounts.INSTALL_KEY_ALREADY_USED || 0,
      expiredKeyRejections: denialCounts.INSTALL_KEY_EXPIRED || 0,
      delegatedApplicable: connectionCounts.delegatedApplicable || 0,
    },
    unavailable: {
      keysIssued:
        'Install keys are partner-scoped before resolution and cannot be attributed to a receiving workspace.',
      keysExpired: 'Unresolved expired keys are not attributable to a receiving workspace.',
    },
  };
}

async function getLatency(input, actor = {}) {
  const identity = requireIdentity(input);
  const window = parseWindow(input?.window);
  const connectionIds = await connectionIdsForWorkspace(
    identity.receivingWorkspaceId,
    partnerIdFrom(actor),
  );
  const match = invocationMatch(identity.receivingWorkspaceId, connectionIds, window.since, {
    ...successfulInvocationFilter(),
    durationMs: { $type: 'number' },
  });
  const [rows, total] = await Promise.all([
    Invocation.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: MAX_LATENCY_SAMPLE_SIZE },
      { $project: { _id: 0, durationMs: 1, stageMetrics: 1 } },
    ]),
    Invocation.countDocuments(match),
  ]);
  const stageValues = new Map(OPERATION_STAGE_NAMES.map((stage) => [stage, []]));
  for (const row of rows) {
    for (const metric of (row.stageMetrics || []).slice(0, 16)) {
      if (stageValues.has(metric.stage) && Number.isFinite(metric.durationMs)) {
        stageValues.get(metric.stage).push(metric.durationMs);
      }
    }
  }
  return {
    window: windowView(window),
    sample: {
      size: rows.length,
      total,
      limit: MAX_LATENCY_SAMPLE_SIZE,
      truncated: total > rows.length,
      method: 'Most recent completed invocations; linear-interpolated percentiles.',
    },
    overall: latencyStatistics(rows.map((row) => row.durationMs)),
    stages: [...stageValues.entries()]
      .map(([stage, values]) => ({ stage, ...latencyStatistics(values) }))
      .filter((item) => item.count > 0),
  };
}

async function getErrors(input, actor = {}) {
  const identity = requireIdentity(input);
  const window = parseWindow(input?.window);
  const pagination = pageFromInput(input);
  const connectionIds = await connectionIdsForWorkspace(
    identity.receivingWorkspaceId,
    partnerIdFrom(actor),
  );
  const match = invocationMatch(
    identity.receivingWorkspaceId,
    connectionIds,
    window.since,
    problemInvocationFilter(),
  );
  const [facet = { groups: [], meta: [], totals: [] }] = await Invocation.aggregate([
    { $match: match },
    {
      $lookup: {
        from: PassportConnection.collection.name,
        localField: 'connectionId',
        foreignField: '_id',
        as: 'connectionHealth',
        pipeline: [{ $project: { _id: 0, lastHealthStatus: 1 } }],
      },
    },
    {
      $set: {
        connectionHealthState: {
          $ifNull: [{ $arrayElemAt: ['$connectionHealth.lastHealthStatus', 0] }, 'unknown'],
        },
      },
    },
    {
      $facet: {
        groups: [
          {
            $group: {
              _id: {
                code: { $ifNull: ['$error.code', 'UNKNOWN'] },
                stage: { $ifNull: ['$error.stage', 'unknown'] },
                retryable: { $eq: ['$error.retryable', true] },
                providerHttpStatus: { $ifNull: ['$error.providerHttpStatus', null] },
                runtimeType: { $ifNull: ['$runtimeType', 'unknown'] },
                connectionHealthState: '$connectionHealthState',
              },
              count: { $sum: 1 },
              latestAt: { $max: '$createdAt' },
            },
          },
          { $sort: { count: -1, latestAt: -1 } },
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        meta: [
          {
            $group: {
              _id: {
                code: '$error.code',
                stage: '$error.stage',
                retryable: '$error.retryable',
                providerHttpStatus: '$error.providerHttpStatus',
                runtimeType: '$runtimeType',
                connectionHealthState: '$connectionHealthState',
              },
            },
          },
          { $count: 'totalGroups' },
        ],
        totals: [
          {
            $group: {
              _id: null,
              failures: { $sum: 1 },
              retryable: { $sum: { $cond: [{ $eq: ['$error.retryable', true] }, 1, 0] } },
              provider429: { $sum: { $cond: [{ $eq: ['$error.providerHttpStatus', 429] }, 1, 0] } },
              providerUnavailable: {
                $sum: { $cond: [{ $in: ['$error.providerHttpStatus', [503, 504]] }, 1, 0] },
              },
            },
          },
        ],
      },
    },
  ]);
  const totals = facet.totals?.[0] || {};
  return {
    window: windowView(window),
    totals: {
      failures: totals.failures || 0,
      retryable: totals.retryable || 0,
      provider429: totals.provider429 || 0,
      providerUnavailable: totals.providerUnavailable || 0,
    },
    groups: (facet.groups || []).map((group) => ({
      errorCode: group._id.code,
      category: errorCategory(group._id.code, group._id.providerHttpStatus),
      stage: OPERATION_STAGE_NAMES.includes(group._id.stage) ? group._id.stage : 'unknown',
      retryable: group._id.retryable,
      providerHttpStatus: Number.isInteger(group._id.providerHttpStatus)
        ? group._id.providerHttpStatus
        : null,
      runtimeType: group._id.runtimeType,
      connectionHealthState: SAFE_HEALTH_STATUSES.has(group._id.connectionHealthState)
        ? group._id.connectionHealthState
        : 'unknown',
      count: group.count,
      percentageOfFailures: rate(group.count, totals.failures || 0),
      latestAt: group.latestAt,
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalGroups: facet.meta?.[0]?.totalGroups || 0,
    },
    recentFailures: await recentFailures(identity.receivingWorkspaceId, connectionIds, window),
  };
}

function alertRulesFromSignals(signals) {
  const rules = [];
  const protection = signals.protection || {
    circuits: {},
    capacity: {},
    service: {},
    rateLimitedConnections: 0,
  };
  const audit = signals.audit || {};
  const durable = signals.durable || {};
  const durableCounts = durable.queue?.counts || {};
  const durableWorkers = durable.workers || {};
  const durableEvents = durable.events || {};
  const executableWork = Number(durable.queue?.dueExecutableCount || 0);
  const oldestPendingThresholdMs = Math.max(
    60_000,
    Math.min(3_600_000, Number(env.DURABLE_WORK_LEASE_MS || 60_000)),
  );
  const retryBacklogThreshold = Math.max(
    3,
    Math.min(100, Number(env.DURABLE_WORKER_BATCH_SIZE || 5)),
  );
  const ambiguousRemoteOutcomeCount = Math.max(
    audit.ambiguousRemoteOutcomes || 0,
    audit.cancellationOutcomeUnknown || 0,
  );
  const add = (condition, rule) => {
    if (condition) rules.push(rule);
  };
  add(signals.readiness.status !== 'ready', {
    type: 'gateway_not_ready',
    severity: 'critical',
    title: 'Gateway is not ready',
    summary: 'Database or runtime configuration readiness is unavailable.',
    metricName: 'gateway_readiness',
    observedValue: signals.readiness.status,
    thresholdValue: 'ready',
    safeValues: {
      database: signals.readiness.database,
      runtimeConfiguration: signals.readiness.runtimeConfiguration,
    },
  });
  add(executableWork > 0 && Number(durableWorkers.readyWorkers || 0) === 0, {
    type: 'durable_work_no_healthy_worker',
    severity: 'critical',
    title: 'Executable work has no healthy worker',
    summary: 'Pending durable work cannot progress because no active worker heartbeat is healthy.',
    metricName: 'durable_executable_work_without_worker',
    observedValue: executableWork,
    thresholdValue: 1,
    safeValues: {
      executableWork,
      readyWorkers: Number(durableWorkers.readyWorkers || 0),
      drainingWorkers: Number(durableWorkers.drainingWorkers || 0),
      staleWorkers: Number(durableWorkers.staleWorkers || 0),
    },
  });
  add(Number(durable.queue?.abandonedLeaseCount || 0) >= env.OPS_ALERT_LEASE_EXPIRY_COUNT, {
    type: 'durable_work_abandoned_leases_high',
    severity: 'critical',
    title: 'Abandoned durable-work leases are elevated',
    summary: 'Multiple owned work records have expired leases and require deterministic recovery.',
    metricName: 'durable_abandoned_lease_count',
    observedValue: Number(durable.queue?.abandonedLeaseCount || 0),
    thresholdValue: env.OPS_ALERT_LEASE_EXPIRY_COUNT,
    safeValues: { count: Number(durable.queue?.abandonedLeaseCount || 0) },
  });
  add(Number(durableEvents.remoteExecutionLeaseLoss || 0) >= env.OPS_ALERT_LEASE_EXPIRY_COUNT, {
    type: 'durable_remote_execution_lease_loss',
    severity: 'critical',
    title: 'Remote execution ownership was repeatedly lost',
    summary: 'Repeated lease loss after outbound transmission created ambiguous remote outcomes.',
    metricName: 'durable_remote_execution_lease_loss_events',
    observedValue: Number(durableEvents.remoteExecutionLeaseLoss || 0),
    thresholdValue: env.OPS_ALERT_LEASE_EXPIRY_COUNT,
    safeValues: { count: Number(durableEvents.remoteExecutionLeaseLoss || 0) },
  });
  add(Number(durableCounts.dead_lettered || 0) > 0, {
    type: 'durable_work_dead_letter_backlog',
    severity: 'critical',
    title: 'Durable-work dead-letter backlog requires review',
    summary: 'One or more exhausted safe retries remain in the workspace dead-letter queue.',
    metricName: 'durable_dead_letter_count',
    observedValue: Number(durableCounts.dead_lettered || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableCounts.dead_lettered || 0) },
  });
  add(Number(durableEvents.finalizationConsistencyFailure || 0) > 0, {
    type: 'durable_work_finalization_consistency_failure',
    severity: 'critical',
    title: 'Durable-work finalization consistency failed',
    summary: 'A remote result could not be safely finalized under current durable ownership.',
    metricName: 'durable_finalization_consistency_failure_events',
    observedValue: Number(durableEvents.finalizationConsistencyFailure || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableEvents.finalizationConsistencyFailure || 0) },
  });
  add(Number(durable.queue?.oldestPendingAgeMs || 0) >= oldestPendingThresholdMs, {
    type: 'durable_work_oldest_pending_high',
    severity: 'warning',
    title: 'Oldest pending durable work is delayed',
    summary:
      'The oldest executable work record has waited longer than the bounded queue threshold.',
    metricName: 'durable_oldest_pending_age_ms',
    observedValue: Number(durable.queue?.oldestPendingAgeMs || 0),
    thresholdValue: oldestPendingThresholdMs,
    safeValues: { ageMs: Number(durable.queue?.oldestPendingAgeMs || 0) },
  });
  add(Number(durableWorkers.staleWorkers || 0) > 0, {
    type: 'durable_worker_heartbeat_stale',
    severity: 'warning',
    title: 'A durable worker heartbeat is stale',
    summary: 'A previously active worker has not renewed its safe process heartbeat.',
    metricName: 'durable_stale_worker_heartbeats',
    observedValue: Number(durableWorkers.staleWorkers || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableWorkers.staleWorkers || 0) },
  });
  add(Number(durableCounts.retry_scheduled || 0) >= retryBacklogThreshold, {
    type: 'durable_retry_backlog_elevated',
    severity: 'warning',
    title: 'Durable retry backlog is elevated',
    summary: 'Scheduled safe retries have reached the bounded worker batch threshold.',
    metricName: 'durable_scheduled_retry_count',
    observedValue: Number(durableCounts.retry_scheduled || 0),
    thresholdValue: retryBacklogThreshold,
    safeValues: { count: Number(durableCounts.retry_scheduled || 0) },
  });
  add(Number(durableEvents.reconciliationCreated || 0) >= env.OPS_ALERT_RECOVERY_GROWTH_COUNT, {
    type: 'durable_reconciliation_repeatedly_created_work',
    severity: 'warning',
    title: 'Reconciliation repeatedly created missing work',
    summary: 'Multiple executable invocations required compensating work-record creation.',
    metricName: 'durable_reconciliation_created_events',
    observedValue: Number(durableEvents.reconciliationCreated || 0),
    thresholdValue: env.OPS_ALERT_RECOVERY_GROWTH_COUNT,
    safeValues: { count: Number(durableEvents.reconciliationCreated || 0) },
  });
  add(
    Number(protection.capacity.activeInvocations || 0) >=
      env.RUNTIME_MAX_CONCURRENT_PER_WORKSPACE && Number(protection.capacity.rejections || 0) > 0,
    {
      type: 'runtime_capacity_continuously_saturated',
      severity: 'warning',
      title: 'Workspace runtime capacity is saturated',
      summary:
        'Active work remains at the workspace limit while additional invocations are rejected.',
      metricName: 'runtime_capacity_active_invocations',
      observedValue: Number(protection.capacity.activeInvocations || 0),
      thresholdValue: env.RUNTIME_MAX_CONCURRENT_PER_WORKSPACE,
      safeValues: {
        activeInvocations: Number(protection.capacity.activeInvocations || 0),
        rejectionCount: Number(protection.capacity.rejections || 0),
      },
    },
  );
  add(Number(durableWorkers.readyWorkers || 0) > 0, {
    type: 'durable_worker_available',
    severity: 'info',
    title: 'Durable worker is active',
    summary: 'At least one durable worker has a current healthy heartbeat.',
    metricName: 'durable_active_workers',
    observedValue: Number(durableWorkers.readyWorkers || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableWorkers.readyWorkers || 0) },
  });
  add(Number(durableWorkers.drainingWorkers || 0) > 0, {
    type: 'durable_worker_draining',
    severity: 'info',
    title: 'Durable worker is draining',
    summary: 'A durable worker stopped claiming new work while its active leases drain.',
    metricName: 'durable_draining_workers',
    observedValue: Number(durableWorkers.drainingWorkers || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableWorkers.drainingWorkers || 0) },
  });
  add(Number(durableEvents.abandonedPreTransmissionRecovered || 0) > 0, {
    type: 'durable_abandoned_work_safely_recovered',
    severity: 'info',
    title: 'Abandoned durable work was safely recovered',
    summary: 'Persisted milestones proved pre-transmission work safe to return to the queue.',
    metricName: 'durable_abandoned_work_recovered_events',
    observedValue: Number(durableEvents.abandonedPreTransmissionRecovered || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableEvents.abandonedPreTransmissionRecovered || 0) },
  });
  add(Number(durableEvents.scheduledRetryCompleted || 0) > 0, {
    type: 'durable_scheduled_retry_completed',
    severity: 'info',
    title: 'A scheduled durable retry completed',
    summary: 'One or more persisted safe retries reached controlled completion.',
    metricName: 'durable_scheduled_retry_completed_events',
    observedValue: Number(durableEvents.scheduledRetryCompleted || 0),
    thresholdValue: 1,
    safeValues: { count: Number(durableEvents.scheduledRetryCompleted || 0) },
  });
  add((protection.circuits.open || 0) >= 2, {
    type: 'multiple_runtime_circuits_open',
    severity: 'critical',
    title: 'Multiple runtime circuits are open',
    summary: 'Several isolated runtime connections are rejecting work to contain failures.',
    metricName: 'open_runtime_circuits',
    observedValue: protection.circuits.open,
    thresholdValue: 2,
    safeValues: { count: protection.circuits.open },
  });
  add((protection.circuits.open || 0) === 1, {
    type: 'runtime_circuit_open',
    severity: 'warning',
    title: 'A runtime circuit is open',
    summary: 'One runtime connection is temporarily rejecting work after repeated failures.',
    metricName: 'open_runtime_circuits',
    observedValue: protection.circuits.open,
    thresholdValue: 1,
    safeValues: { count: protection.circuits.open },
  });
  add((audit.circuitOpened || 0) >= 2, {
    type: 'runtime_circuit_repeatedly_opened',
    severity: 'warning',
    title: 'A runtime circuit opened repeatedly',
    summary: 'Repeated eligible failures or failed recovery probes reopened a runtime circuit.',
    metricName: 'runtime_circuit_open_events',
    observedValue: audit.circuitOpened,
    thresholdValue: 2,
    safeValues: { count: audit.circuitOpened },
  });
  add((protection.circuits.halfOpen || 0) > 0, {
    type: 'runtime_circuit_half_open',
    severity: 'warning',
    title: 'Runtime circuit recovery probe is active',
    summary: 'A limited half-open probe is evaluating runtime recovery.',
    metricName: 'half_open_runtime_circuits',
    observedValue: protection.circuits.halfOpen,
    thresholdValue: 1,
    safeValues: { count: protection.circuits.halfOpen },
  });
  add((protection.rateLimitedConnections || 0) > 0, {
    type: 'runtime_rate_limit_protection_active',
    severity: 'warning',
    title: 'Runtime rate-limit protection is active',
    summary: 'One or more connections are respecting an upstream rate-limit window.',
    metricName: 'rate_limited_connections',
    observedValue: protection.rateLimitedConnections,
    thresholdValue: 1,
    safeValues: { count: protection.rateLimitedConnections },
  });
  add((protection.capacity.rejections || 0) >= 3, {
    type: 'runtime_capacity_rejections',
    severity: 'warning',
    title: 'Runtime capacity rejections are elevated',
    summary: 'Per-connection or per-workspace bulkheads rejected repeated work.',
    metricName: 'runtime_capacity_rejections',
    observedValue: protection.capacity.rejections,
    thresholdValue: 3,
    safeValues: { count: protection.capacity.rejections },
  });
  add(protection.service.draining === true, {
    type: 'service_draining',
    severity: 'info',
    title: 'Gateway shutdown draining began',
    summary: 'New mutations are paused while active invocations drain.',
    metricName: 'service_draining',
    observedValue: true,
    thresholdValue: false,
    safeValues: { phase: protection.service.phase },
  });
  add((audit.circuitClosed || 0) > 0, {
    type: 'runtime_circuit_recovered',
    severity: 'info',
    title: 'Runtime circuit recovered',
    summary: 'A half-open runtime probe succeeded and closed its circuit.',
    metricName: 'runtime_circuits_closed',
    observedValue: audit.circuitClosed,
    thresholdValue: 1,
    safeValues: { count: audit.circuitClosed },
  });
  add((audit.connectionReturnedHealthy || 0) > 0, {
    type: 'connection_returned_healthy',
    severity: 'info',
    title: 'Connection returned to healthy',
    summary: 'A successful passive or active signal restored connection health.',
    metricName: 'connections_returned_healthy',
    observedValue: audit.connectionReturnedHealthy,
    thresholdValue: 1,
    safeValues: { count: audit.connectionReturnedHealthy },
  });
  add((audit.shutdownInterrupted || 0) > 0, {
    type: 'shutdown_drain_deadline_exceeded',
    severity: 'critical',
    title: 'Shutdown drain deadline was exceeded',
    summary: 'One or more transmitted invocations required shutdown recovery handling.',
    metricName: 'shutdown_interrupted_invocations',
    observedValue: audit.shutdownInterrupted,
    thresholdValue: 1,
    safeValues: { count: audit.shutdownInterrupted },
  });
  add(ambiguousRemoteOutcomeCount >= env.OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT, {
    type: 'high_ambiguous_remote_outcomes',
    severity: 'critical',
    title: 'Ambiguous remote outcomes are elevated',
    summary: 'Multiple transmitted invocations require explicit operator review.',
    metricName: 'ambiguous_remote_outcome_events',
    observedValue: ambiguousRemoteOutcomeCount,
    thresholdValue: env.OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT,
    safeValues: { count: ambiguousRemoteOutcomeCount },
  });
  add((audit.finalizationStalled || 0) >= env.OPS_ALERT_FINALIZATION_STALL_COUNT, {
    type: 'repeated_finalization_stalls',
    severity: 'critical',
    title: 'Invocation finalization is repeatedly stalled',
    summary: 'Remote responses were received but safe local finalization did not complete.',
    metricName: 'finalization_stalled_events',
    observedValue: audit.finalizationStalled,
    thresholdValue: env.OPS_ALERT_FINALIZATION_STALL_COUNT,
    safeValues: { count: audit.finalizationStalled },
  });
  add((audit.recoveryEligible || 0) >= env.OPS_ALERT_RECOVERY_GROWTH_COUNT, {
    type: 'recovery_queue_increasing',
    severity: 'critical',
    title: 'Recovery review queue is increasing',
    summary: 'New invocations are entering controlled recovery review rapidly.',
    metricName: 'recovery_eligible_events',
    observedValue: audit.recoveryEligible,
    thresholdValue: env.OPS_ALERT_RECOVERY_GROWTH_COUNT,
    safeValues: { count: audit.recoveryEligible },
  });
  add((audit.cancellationOutcomeUnknown || 0) > 0, {
    type: 'cancellation_outcome_unknown',
    severity: 'warning',
    title: 'Cancellation outcome is not confirmed',
    summary: 'A local abort could not prove that remote execution stopped.',
    metricName: 'cancellation_outcome_unknown_events',
    observedValue: audit.cancellationOutcomeUnknown,
    thresholdValue: 1,
    safeValues: { count: audit.cancellationOutcomeUnknown },
  });
  for (const item of audit.stuckByConnection || []) {
    add(item.count >= env.OPS_ALERT_STUCK_INVOCATION_COUNT, {
      type: 'repeated_stuck_invocations',
      scopeKey: item.connectionId,
      severity: 'warning',
      title: 'A connection has repeated stuck invocations',
      summary: 'Bounded recovery scans found repeated stale or overdue work for one connection.',
      metricName: 'stuck_invocation_events_per_connection',
      observedValue: item.count,
      thresholdValue: env.OPS_ALERT_STUCK_INVOCATION_COUNT,
      safeValues: { connectionId: item.connectionId, count: item.count },
    });
  }
  add((audit.leaseExpired || 0) >= env.OPS_ALERT_LEASE_EXPIRY_COUNT, {
    type: 'execution_leases_frequently_expiring',
    severity: 'warning',
    title: 'Execution leases are frequently expiring',
    summary: 'Repeated ownership expiry requires runtime recovery review.',
    metricName: 'execution_lease_expiry_events',
    observedValue: audit.leaseExpired,
    thresholdValue: env.OPS_ALERT_LEASE_EXPIRY_COUNT,
    safeValues: { count: audit.leaseExpired },
  });
  add((audit.manualRetryDenied || 0) >= env.OPS_ALERT_RETRY_DENIAL_COUNT, {
    type: 'manual_retries_repeatedly_denied',
    severity: 'warning',
    title: 'Manual retries are repeatedly denied',
    summary: 'Recovery policy could not prove repeated replay requests safe.',
    metricName: 'manual_retry_denied_events',
    observedValue: audit.manualRetryDenied,
    thresholdValue: env.OPS_ALERT_RETRY_DENIAL_COUNT,
    safeValues: { count: audit.manualRetryDenied },
  });
  add((audit.cancellationConfirmed || 0) > 0, {
    type: 'invocation_cancellation_confirmed',
    severity: 'info',
    title: 'Invocation cancellation was confirmed',
    summary: 'One or more invocations were cancelled before uncertain remote execution.',
    metricName: 'cancellation_confirmed_events',
    observedValue: audit.cancellationConfirmed,
    thresholdValue: 1,
    safeValues: { count: audit.cancellationConfirmed },
  });
  add((audit.recoveryResolved || 0) > 0, {
    type: 'invocation_recovery_completed',
    severity: 'info',
    title: 'Invocation recovery action completed',
    summary: 'Operator-reviewed recovery work reached a controlled resolution.',
    metricName: 'recovery_resolved_events',
    observedValue: audit.recoveryResolved,
    thresholdValue: 1,
    safeValues: { count: audit.recoveryResolved },
  });
  add((audit.stuckResolved || 0) > 0, {
    type: 'stuck_invocation_resolved',
    severity: 'info',
    title: 'Stuck invocation was resolved',
    summary:
      'Operator-reviewed work previously classified as stuck reached a controlled resolution.',
    metricName: 'stuck_invocation_resolved_events',
    observedValue: audit.stuckResolved,
    thresholdValue: 1,
    safeValues: { count: audit.stuckResolved },
  });
  add(
    signals.invocations.total >= env.OPS_ALERT_FAILURE_RATE_MIN_INVOCATIONS &&
      signals.invocations.failureRatePercent >= env.OPS_ALERT_FAILURE_RATE_PERCENT,
    {
      type: 'high_invocation_failure_rate',
      severity: 'critical',
      title: 'Invocation failure rate is high',
      summary: `Failures reached the configured ${env.OPS_ALERT_FAILURE_RATE_PERCENT}% threshold.`,
      metricName: 'invocation_failure_rate_percent',
      observedValue: signals.invocations.failureRatePercent,
      thresholdValue: env.OPS_ALERT_FAILURE_RATE_PERCENT,
      safeValues: {
        total: signals.invocations.total,
        failed: signals.invocations.failed,
        timedOut: signals.invocations.timedOut || 0,
        recoveryRequired: signals.invocations.recoveryRequired || 0,
        failureRatePercent: signals.invocations.failureRatePercent,
      },
    },
  );
  add(signals.invocations.recoveryRequired > 0, {
    type: 'invocations_recovery_required',
    severity: 'critical',
    title: 'Ambiguous invocation outcomes require recovery',
    summary: 'One or more external executions require explicit recovery review.',
    metricName: 'invocations_recovery_required',
    observedValue: signals.invocations.recoveryRequired,
    thresholdValue: 1,
    safeValues: { count: signals.invocations.recoveryRequired },
  });
  add((signals.invocations.attempts?.repeatedTransientFailures || 0) > 0, {
    type: 'repeated_transient_invocation_failures',
    severity: 'warning',
    title: 'Repeated transient invocation failures detected',
    summary: 'One or more invocations recorded multiple attempts and a transient final failure.',
    metricName: 'repeated_transient_invocation_failures',
    observedValue: signals.invocations.attempts?.repeatedTransientFailures || 0,
    thresholdValue: 1,
    safeValues: { count: signals.invocations.attempts?.repeatedTransientFailures || 0 },
  });
  add(
    signals.connections.active > 0 &&
      signals.connections.health.healthy === 0 &&
      signals.connections.health.unhealthy > 0,
    {
      type: 'all_connections_unhealthy',
      severity: 'critical',
      title: 'All checked active connections are unhealthy',
      summary: 'No checked active connection is currently healthy.',
      metricName: 'healthy_active_connections',
      observedValue: signals.connections.health.healthy,
      thresholdValue: 1,
      safeValues: {
        active: signals.connections.active,
        unhealthy: signals.connections.health.unhealthy,
      },
    },
  );
  add(signals.errors.credentialFailures > 0, {
    type: 'credential_decryption_failures',
    severity: 'critical',
    title: 'Credential decryption failures detected',
    summary: 'One or more invocations failed while loading protected credentials.',
    metricName: 'credential_failures',
    observedValue: signals.errors.credentialFailures,
    thresholdValue: 1,
    safeValues: { count: signals.errors.credentialFailures },
  });
  add((audit.authFailures || 0) >= env.OPS_ALERT_AUTH_FAILURE_COUNT, {
    type: 'repeated_auth_failures',
    severity: 'critical',
    title: 'Repeated authorization failures detected',
    summary: `Authorization denials reached the configured count of ${env.OPS_ALERT_AUTH_FAILURE_COUNT}.`,
    metricName: 'authorization_failures',
    observedValue: audit.authFailures || 0,
    thresholdValue: env.OPS_ALERT_AUTH_FAILURE_COUNT,
    safeValues: { count: audit.authFailures || 0 },
  });
  add(signals.errors.providerErrors >= env.OPS_ALERT_PROVIDER_ERROR_COUNT, {
    type: 'provider_errors',
    severity: 'warning',
    title: 'Provider throttling or availability errors detected',
    summary: `HTTP 429/503/504 failures reached the configured count of ${env.OPS_ALERT_PROVIDER_ERROR_COUNT}.`,
    metricName: 'provider_errors',
    observedValue: signals.errors.providerErrors,
    thresholdValue: env.OPS_ALERT_PROVIDER_ERROR_COUNT,
    safeValues: { count: signals.errors.providerErrors },
  });
  add(signals.errors.timeoutFailures >= env.OPS_ALERT_PROVIDER_ERROR_COUNT, {
    type: 'runtime_timeouts',
    severity: 'warning',
    title: 'Repeated Runtime Gateway timeouts detected',
    summary: `Timeout failures reached the configured count of ${env.OPS_ALERT_PROVIDER_ERROR_COUNT}.`,
    metricName: 'runtime_timeouts',
    observedValue: signals.errors.timeoutFailures,
    thresholdValue: env.OPS_ALERT_PROVIDER_ERROR_COUNT,
    safeValues: { count: signals.errors.timeoutFailures },
  });
  add(signals.latency.p95Ms !== null && signals.latency.p95Ms >= env.OPS_ALERT_P95_LATENCY_MS, {
    type: 'high_p95_latency',
    severity: 'warning',
    title: 'Invocation p95 latency is high',
    summary: `P95 latency exceeded the configured ${env.OPS_ALERT_P95_LATENCY_MS} ms threshold.`,
    metricName: 'p95_latency_ms',
    observedValue: signals.latency.p95Ms,
    thresholdValue: env.OPS_ALERT_P95_LATENCY_MS,
    safeValues: { p95Ms: signals.latency.p95Ms },
  });
  add(
    signals.funnel.totals.resolutionAttempts >= 4 &&
      rate(signals.funnel.totals.reusedKeyRejections, signals.funnel.totals.resolutionAttempts) >=
        env.OPS_ALERT_INSTALL_FAILURE_PERCENT,
    {
      type: 'reused_install_keys',
      severity: 'warning',
      title: 'Reused install-key rejections are elevated',
      summary: `Reused-key rejections reached the configured ${env.OPS_ALERT_INSTALL_FAILURE_PERCENT}% threshold.`,
      metricName: 'reused_key_rejection_rate_percent',
      observedValue: rate(
        signals.funnel.totals.reusedKeyRejections,
        signals.funnel.totals.resolutionAttempts,
      ),
      thresholdValue: env.OPS_ALERT_INSTALL_FAILURE_PERCENT,
      safeValues: {
        attempts: signals.funnel.totals.resolutionAttempts,
        reusedKeyRejections: signals.funnel.totals.reusedKeyRejections,
      },
    },
  );
  add(signals.connections.health.unhealthy > 0, {
    type: 'unhealthy_connections',
    severity: 'warning',
    title: 'Unhealthy connections require attention',
    summary: 'At least one active connection is unhealthy or unreachable.',
    metricName: 'unhealthy_connections',
    observedValue: signals.connections.health.unhealthy,
    thresholdValue: 1,
    safeValues: { count: signals.connections.health.unhealthy },
  });
  add((signals.connections.health.degraded || 0) > 0, {
    type: 'degraded_connections',
    severity: 'warning',
    title: 'Connections are degraded',
    summary: 'Eligible passive or active failures degraded one or more connections.',
    metricName: 'degraded_connections',
    observedValue: signals.connections.health.degraded,
    thresholdValue: 1,
    safeValues: { count: signals.connections.health.degraded },
  });
  add(
    signals.funnel.totals.resolutionAttempts >= 4 &&
      100 - signals.funnel.totals.resolutionSuccessRatePercent >=
        env.OPS_ALERT_INSTALL_FAILURE_PERCENT,
    {
      type: 'install_resolution_failures',
      severity: 'warning',
      title: 'Install resolution failure rate is high',
      summary: `Install failures reached the configured ${env.OPS_ALERT_INSTALL_FAILURE_PERCENT}% threshold.`,
      metricName: 'install_failure_rate_percent',
      observedValue: 100 - signals.funnel.totals.resolutionSuccessRatePercent,
      thresholdValue: env.OPS_ALERT_INSTALL_FAILURE_PERCENT,
      safeValues: {
        attempts: signals.funnel.totals.resolutionAttempts,
        failures: signals.funnel.totals.resolutionFailures,
      },
    },
  );
  add(signals.invocations.total > 0 && signals.invocations.successful === 0, {
    type: 'no_successful_invocations',
    severity: 'info',
    title: 'No successful invocations in the last 24 hours',
    summary: 'Invocation activity exists, but none completed successfully.',
    metricName: 'successful_invocations',
    observedValue: signals.invocations.successful,
    thresholdValue: 1,
    safeValues: { total: signals.invocations.total },
  });
  add(signals.connections.health.unknown > 0, {
    type: 'connections_health_unknown',
    severity: 'info',
    title: 'Some active connection health is unknown',
    summary: 'Run connection health checks to establish current status.',
    metricName: 'unknown_health_connections',
    observedValue: signals.connections.health.unknown,
    thresholdValue: 1,
    safeValues: { count: signals.connections.health.unknown },
  });
  return rules;
}

async function alertErrorSignals(receivingWorkspaceId, connectionIds, window) {
  const [row = {}] = await Invocation.aggregate([
    {
      $match: invocationMatch(
        receivingWorkspaceId,
        connectionIds,
        window.since,
        problemInvocationFilter(),
      ),
    },
    {
      $group: {
        _id: null,
        providerErrors: {
          $sum: { $cond: [{ $in: ['$error.providerHttpStatus', [429, 503, 504]] }, 1, 0] },
        },
        credentialFailures: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$error.stage', 'credential_decryption'] },
                  {
                    $in: [
                      '$error.code',
                      ['ENCRYPTION_CONFIGURATION_INVALID', 'CREDENTIAL_EXPIRED'],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        timeoutFailures: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $regexMatch: { input: { $ifNull: ['$error.code', ''] }, regex: /TIMEOUT/i } },
                  { $eq: ['$error.providerHttpStatus', 504] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return {
    providerErrors: row.providerErrors || 0,
    credentialFailures: row.credentialFailures || 0,
    timeoutFailures: row.timeoutFailures || 0,
  };
}

async function alertAuditSignals(receivingWorkspaceId, connectionIds, window) {
  const [facet = { totals: [], stuckByConnection: [], ambiguousInvocations: [] }] =
    await AuditLog.aggregate([
      {
        $match: {
          ...ownedConnectionAuditMatch(receivingWorkspaceId, connectionIds),
          createdAt: { $gte: window.since },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                authFailures: {
                  $sum: {
                    $cond: [
                      { $in: ['$metadata.errorCode', ['AUTHENTICATION_REQUIRED', 'FORBIDDEN']] },
                      1,
                      0,
                    ],
                  },
                },
                circuitClosed: {
                  $sum: { $cond: [{ $eq: ['$action', 'circuit.closed'] }, 1, 0] },
                },
                circuitOpened: {
                  $sum: { $cond: [{ $eq: ['$action', 'circuit.opened'] }, 1, 0] },
                },
                connectionReturnedHealthy: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$action', 'connection.health_changed'] },
                          { $eq: ['$metadata.toState', 'healthy'] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                shutdownInterrupted: {
                  $sum: {
                    $cond: [{ $eq: ['$action', 'invocation.shutdown_interrupted'] }, 1, 0],
                  },
                },
                cancellationConfirmed: {
                  $sum: {
                    $cond: [{ $eq: ['$action', 'invocation.cancel.confirmed'] }, 1, 0],
                  },
                },
                cancellationOutcomeUnknown: {
                  $sum: {
                    $cond: [{ $eq: ['$action', 'invocation.cancel.outcome_unknown'] }, 1, 0],
                  },
                },
                stuckDetected: {
                  $sum: { $cond: [{ $eq: ['$action', 'invocation.stuck.detected'] }, 1, 0] },
                },
                finalizationStalled: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$action', 'invocation.stuck.detected'] },
                          { $eq: ['$metadata.stuckClassification', 'finalization_stalled'] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                leaseExpired: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$action', 'invocation.stuck.detected'] },
                          { $eq: ['$metadata.reasonCode', 'EXECUTION_LEASE_EXPIRED'] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                recoveryEligible: {
                  $sum: { $cond: [{ $eq: ['$action', 'invocation.recovery.eligible'] }, 1, 0] },
                },
                manualRetryDenied: {
                  $sum: {
                    $cond: [{ $eq: ['$action', 'invocation.recovery.retry_denied'] }, 1, 0],
                  },
                },
                recoveryResolved: {
                  $sum: { $cond: [{ $eq: ['$action', 'invocation.recovery.resolved'] }, 1, 0] },
                },
                stuckResolved: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$action', 'invocation.stuck.resolved'] },
                          {
                            $and: [
                              { $eq: ['$action', 'invocation.recovery.resolved'] },
                              {
                                $in: [
                                  '$metadata.stuckClassification',
                                  [
                                    'stale_before_runtime',
                                    'external_runtime_overdue',
                                    'lease_expired',
                                    'finalization_stalled',
                                    'shutdown_interrupted',
                                    'outcome_ambiguous',
                                  ],
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          stuckByConnection: [
            {
              $match: {
                action: 'invocation.stuck.detected',
                'metadata.connectionId': { $type: 'string' },
              },
            },
            { $group: { _id: '$metadata.connectionId', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 100 },
          ],
          ambiguousInvocations: [
            {
              $match: {
                $or: [
                  { action: 'invocation.cancel.outcome_unknown' },
                  {
                    action: 'invocation.recovery.eligible',
                    'metadata.reasonCode': {
                      $in: [
                        'REMOTE_OUTCOME_UNKNOWN',
                        'REMOTE_OUTCOME_AMBIGUOUS',
                        'REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS',
                        'AMBIGUOUS_REMOTE_OUTCOME',
                        'RESPONSE_PERSISTENCE_UNCERTAIN',
                        'RUNTIME_DEADLINE_EXCEEDED',
                        'EXECUTION_LEASE_EXPIRED',
                        'FINALIZATION_STALLED',
                        'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
                        'RECOVERY_CLAIM_INTERRUPTED',
                        'CHILD_REMOTE_OUTCOME_UNKNOWN',
                      ],
                    },
                  },
                ],
              },
            },
            { $group: { _id: { $ifNull: ['$invocationId', '$metadata.invocationId'] } } },
            { $match: { _id: { $type: 'string' } } },
            { $count: 'count' },
          ],
        },
      },
    ]);
  const row = facet.totals?.[0] || {};
  return {
    authFailures: row.authFailures || 0,
    circuitClosed: row.circuitClosed || 0,
    circuitOpened: row.circuitOpened || 0,
    connectionReturnedHealthy: row.connectionReturnedHealthy || 0,
    shutdownInterrupted: row.shutdownInterrupted || 0,
    cancellationConfirmed: row.cancellationConfirmed || 0,
    cancellationOutcomeUnknown: row.cancellationOutcomeUnknown || 0,
    ambiguousRemoteOutcomes: facet.ambiguousInvocations?.[0]?.count || 0,
    stuckDetected: row.stuckDetected || 0,
    finalizationStalled: row.finalizationStalled || 0,
    leaseExpired: row.leaseExpired || 0,
    recoveryEligible: row.recoveryEligible || 0,
    manualRetryDenied: row.manualRetryDenied || 0,
    recoveryResolved: row.recoveryResolved || 0,
    stuckResolved: row.stuckResolved || 0,
    stuckByConnection: (facet.stuckByConnection || []).map((item) => ({
      connectionId: String(item._id),
      count: Number(item.count || 0),
    })),
  };
}

async function syncOperationalAlerts(receivingWorkspaceId, rules, now = new Date(), actor = {}) {
  const partnerId = partnerIdFrom(actor);
  const scopeFilter = {
    receivingWorkspaceId,
    ...(partnerId ? { partnerId } : { partnerId: { $exists: false } }),
  };
  const existing = await OperationalAlert.find(scopeFilter).lean();
  const byDedupeKey = new Map(existing.map((alert) => [alert.dedupeKey, alert]));
  const dedupeKeyFor = (rule) =>
    partnerId
      ? `${String(partnerId)}:${receivingWorkspaceId}:${rule.type}:${rule.scopeKey || 'workspace'}`
      : `${receivingWorkspaceId}:${rule.type}${rule.scopeKey ? `:${rule.scopeKey}` : ''}`;
  const activeDedupeKeys = new Set(rules.map(dedupeKeyFor));
  const operations = [];
  for (const rule of rules) {
    const dedupeKey = dedupeKeyFor(rule);
    const current = byDedupeKey.get(dedupeKey);
    if (!current) {
      operations.push({
        updateOne: {
          filter: { dedupeKey },
          update: {
            $setOnInsert: {
              ...(partnerId ? { partnerId } : {}),
              receivingWorkspaceId,
              type: rule.type,
              ...(rule.scopeKey ? { scopeKey: rule.scopeKey } : {}),
              dedupeKey,
              occurrenceCount: 1,
              firstSeenAt: now,
            },
            $set: {
              severity: rule.severity,
              status: 'active',
              title: rule.title,
              summary: rule.summary,
              metricName: rule.metricName,
              observedValue: rule.observedValue,
              thresholdValue: rule.thresholdValue,
              safeValues: rule.safeValues,
              lastSeenAt: now,
            },
          },
          upsert: true,
        },
      });
    } else if (current.status === 'resolved') {
      operations.push({
        updateOne: {
          filter: { _id: current._id, status: 'resolved' },
          update: {
            $set: {
              severity: rule.severity,
              status: 'active',
              title: rule.title,
              summary: rule.summary,
              metricName: rule.metricName,
              observedValue: rule.observedValue,
              thresholdValue: rule.thresholdValue,
              safeValues: rule.safeValues,
              lastSeenAt: now,
            },
            $unset: { acknowledgedAt: 1, acknowledgedByUserId: 1, resolvedAt: 1 },
            $inc: { occurrenceCount: 1 },
          },
        },
      });
    } else {
      operations.push({
        updateOne: {
          filter: { _id: current._id },
          update: {
            $set: {
              severity: rule.severity,
              title: rule.title,
              summary: rule.summary,
              metricName: rule.metricName,
              observedValue: rule.observedValue,
              thresholdValue: rule.thresholdValue,
              safeValues: rule.safeValues,
              lastSeenAt: now,
            },
          },
        },
      });
    }
  }
  for (const current of existing) {
    if (!activeDedupeKeys.has(current.dedupeKey) && current.status !== 'resolved') {
      operations.push({
        updateOne: {
          filter: { _id: current._id, status: { $ne: 'resolved' } },
          update: { $set: { status: 'resolved', resolvedAt: now } },
        },
      });
    }
  }
  if (operations.length) await OperationalAlert.bulkWrite(operations, { ordered: false });
}

async function durableAlertSignals(receivingWorkspaceId, window, actor = {}) {
  const partnerId = partnerIdFrom(actor);
  if (!partnerId) {
    return {
      queue: {
        counts: {},
        dueExecutableCount: 0,
        abandonedLeaseCount: 0,
        oldestPendingAgeMs: 0,
      },
      workers: {
        status: 'no_active_worker',
        activeWorkers: 0,
        readyWorkers: 0,
        drainingWorkers: 0,
        staleWorkers: 0,
      },
      events: {},
    };
  }
  const [queue, workers, eventRows] = await Promise.all([
    durableWork.durableWorkMetrics({ partnerId, receivingWorkspaceId }),
    durableWork.aggregateWorkerHealth(),
    DurableEventOutbox.aggregate([
      {
        $match: {
          partnerId,
          receivingWorkspaceId,
          createdAt: { $gte: window.since },
        },
      },
      {
        $group: {
          _id: null,
          remoteExecutionLeaseLoss: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'work.recovery_required'] },
                    {
                      $in: [
                        '$safeMetadata.recoveryReasonCode',
                        ['LEASE_EXPIRED_AFTER_TRANSMISSION', 'WORKER_LOST_DURING_REMOTE_EXECUTION'],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          finalizationConsistencyFailure: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'work.recovery_required'] },
                    {
                      $in: [
                        '$safeMetadata.recoveryReasonCode',
                        ['WORKER_LOST_DURING_FINALIZATION', 'RESULT_PERSISTENCE_UNCERTAIN'],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          reconciliationCreated: {
            $sum: { $cond: [{ $eq: ['$eventType', 'work.reconciled'] }, 1, 0] },
          },
          abandonedPreTransmissionRecovered: {
            $sum: { $cond: [{ $eq: ['$eventType', 'work.abandoned_recovered'] }, 1, 0] },
          },
          scheduledRetryCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$eventType', 'work.completed'] },
                    { $gt: [{ $ifNull: ['$safeMetadata.retryCount', 0] }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);
  const events = eventRows?.[0] || {};
  return {
    queue,
    workers,
    events: {
      remoteExecutionLeaseLoss: Number(events.remoteExecutionLeaseLoss || 0),
      finalizationConsistencyFailure: Number(events.finalizationConsistencyFailure || 0),
      reconciliationCreated: Number(events.reconciliationCreated || 0),
      abandonedPreTransmissionRecovered: Number(events.abandonedPreTransmissionRecovered || 0),
      scheduledRetryCompleted: Number(events.scheduledRetryCompleted || 0),
    },
  };
}

async function evaluateWorkspaceAlerts(
  receivingWorkspaceId,
  connectionIds,
  now = new Date(),
  actor = {},
) {
  const window = parseWindow(ALERT_WINDOW, now);
  const partnerId = partnerIdFrom(actor);
  const [connections, invocations, funnel, latency, errors, audit, protection, durable] =
    await Promise.all([
      connectionSummary(receivingWorkspaceId, window, connectionIds),
      invocationSummary(receivingWorkspaceId, connectionIds, window),
      installationFunnel(receivingWorkspaceId, connectionIds, window, partnerId),
      getLatency(
        {
          receivingWorkspaceId,
          receivingUserId: 'system-alert-evaluator',
          window: ALERT_WINDOW,
        },
        actor,
      ),
      alertErrorSignals(receivingWorkspaceId, connectionIds, window),
      alertAuditSignals(receivingWorkspaceId, connectionIds, window),
      reliabilitySummary(receivingWorkspaceId, window, connectionIds),
      durableAlertSignals(receivingWorkspaceId, window, actor),
    ]);
  const database = databaseStatus();
  const runtimeConfiguration = runtimeConfigurationStatus();
  const lifecycle = serviceLifecycle.snapshot();
  const signals = {
    readiness: {
      status:
        lifecycle.ready && database === 'connected' && runtimeConfiguration === 'valid'
          ? 'ready'
          : 'not_ready',
      database,
      runtimeConfiguration,
    },
    connections,
    invocations,
    funnel,
    latency: latency.overall,
    errors,
    audit,
    protection,
    durable,
  };
  await syncOperationalAlerts(receivingWorkspaceId, alertRulesFromSignals(signals), now, actor);
}

async function alertCounts(receivingWorkspaceId, actor = {}) {
  const partnerId = partnerIdFrom(actor);
  const rows = await OperationalAlert.aggregate([
    {
      $match: {
        receivingWorkspaceId,
        ...(partnerId ? { partnerId } : { partnerId: { $exists: false } }),
        status: { $in: ['active', 'acknowledged'] },
      },
    },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  return {
    active: rows.reduce((sum, row) => sum + row.count, 0),
    critical: counts.critical || 0,
    warning: counts.warning || 0,
    info: counts.info || 0,
  };
}

async function getSummary(input, actor = {}) {
  const identity = requireIdentity(input);
  const window = parseWindow(input?.window);
  const partnerId = partnerIdFrom(actor);
  const connectionIds = await connectionIdsForWorkspace(identity.receivingWorkspaceId, partnerId);
  const [passports, connections, invocations, controls, failures, funnel, protection] =
    await Promise.all([
      passportSummary(identity.receivingWorkspaceId, window, connectionIds),
      connectionSummary(identity.receivingWorkspaceId, window, connectionIds),
      invocationSummary(identity.receivingWorkspaceId, connectionIds, window),
      invocationControlSummary(identity.receivingWorkspaceId, connectionIds, window),
      recentFailures(identity.receivingWorkspaceId, connectionIds, window),
      installationFunnel(identity.receivingWorkspaceId, connectionIds, window, partnerId),
      reliabilitySummary(identity.receivingWorkspaceId, window, connectionIds),
    ]);
  await evaluateWorkspaceAlerts(identity.receivingWorkspaceId, connectionIds, new Date(), actor);
  const database = databaseStatus();
  const runtimeConfiguration = runtimeConfigurationStatus();
  const lifecycle = serviceLifecycle.snapshot();
  const funnelCounts = Object.fromEntries(funnel.steps.map((step) => [step.key, step.count]));
  return {
    window: windowView(window),
    readiness: {
      service: 'agent-passport-runtime-gateway',
      version: packageMetadata.version,
      status:
        lifecycle.ready && database === 'connected' && runtimeConfiguration === 'valid'
          ? 'ready'
          : 'not_ready',
      database,
      runtimeConfiguration,
    },
    passports,
    connections,
    invocations: { ...invocations, controls, recentFailures: failures },
    installations: {
      keysIssued: null,
      keysIssuedAvailability: 'unavailable',
      keysResolved: funnelCounts.keysResolved || 0,
      expiredKeys: null,
      expiredKeysAvailability: 'unavailable',
      expiredKeyRejections: funnel.totals.expiredKeyRejections,
      reusedKeyRejections: funnel.totals.reusedKeyRejections,
      resolutionAttempts: funnel.totals.resolutionAttempts,
      resolutionFailures: funnel.totals.resolutionFailures,
      resolutionSuccessRatePercent: funnel.totals.resolutionSuccessRatePercent,
      connectionsCreated: funnelCounts.connectionsCreated || 0,
      verifiedConnections: funnelCounts.connectionsVerified || 0,
    },
    alerts: await alertCounts(identity.receivingWorkspaceId, actor),
    protection,
  };
}

async function getPassportFunnel(input, actor = {}) {
  const identity = requireIdentity(input);
  const window = parseWindow(input?.window);
  const partnerId = partnerIdFrom(actor);
  const connectionIds = await connectionIdsForWorkspace(identity.receivingWorkspaceId, partnerId);
  return {
    window: windowView(window),
    ...(await installationFunnel(identity.receivingWorkspaceId, connectionIds, window, partnerId)),
  };
}

function serializeAlert(alert) {
  return {
    alertId: String(alert._id || alert.id),
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    summary: alert.summary,
    metricName: alert.metricName,
    observedValue: alert.observedValue,
    thresholdValue: alert.thresholdValue,
    safeValues: alert.safeValues || {},
    occurrenceCount: alert.occurrenceCount,
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    acknowledgedAt: alert.acknowledgedAt || null,
    acknowledgedByUserId: alert.acknowledgedByUserId || null,
    resolvedAt: alert.resolvedAt || null,
  };
}

async function listAlerts(input, actor = {}) {
  const identity = requireIdentity(input);
  const pagination = pageFromInput(input);
  const partnerId = partnerIdFrom(actor);
  const filter = {
    receivingWorkspaceId: identity.receivingWorkspaceId,
    ...(partnerId ? { partnerId } : { partnerId: { $exists: false } }),
  };
  if (input?.status) {
    if (!SAFE_ALERT_STATUSES.has(input.status)) {
      throw validationError('status', 'status must be active, acknowledged, or resolved.');
    }
    filter.status = input.status;
  } else {
    filter.status = { $in: ['active', 'acknowledged'] };
  }
  const [items, total] = await Promise.all([
    OperationalAlert.find(filter)
      .sort({ severity: 1, lastSeenAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    OperationalAlert.countDocuments(filter),
  ]);
  return {
    items: items.map(serializeAlert),
    pagination: { page: pagination.page, limit: pagination.limit, total },
  };
}

async function acknowledgeAlert(alertId, input, actor = {}) {
  const identity = requireIdentity(input);
  const partnerId = partnerIdFrom(actor);
  await assertAuthorized(
    actorFromPartner(actor.partner || { _id: partnerId }, { workspaceId: identity.receivingWorkspaceId }),
    'operations.manage',
    {
      type: 'OperationalAlert',
      id: alertId,
      partnerId,
      organizationId: partnerId,
      workspaceId: identity.receivingWorkspaceId,
    },
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: identity.receivingWorkspaceId,
    },
  );
  const now = new Date();
  const alert = await OperationalAlert.findOneAndUpdate(
    {
      _id: alertId,
      receivingWorkspaceId: identity.receivingWorkspaceId,
      ...(partnerId ? { partnerId } : { partnerId: { $exists: false } }),
      status: { $in: ['active', 'acknowledged'] },
    },
    {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: now,
        acknowledgedByUserId: actor.partner?._id
          ? `partner:${String(actor.partner._id)}`
          : identity.receivingUserId,
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!alert) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Operational alert was not found.');
  return serializeAlert(alert);
}

module.exports = {
  requireIdentity,
  parseWindow,
  rate,
  percentile,
  latencyStatistics,
  invocationSummary,
  invocationControlSummary,
  safeFailure,
  alertAuditSignals,
  alertRulesFromSignals,
  durableAlertSignals,
  reliabilitySummary,
  syncOperationalAlerts,
  getSummary,
  getLatency,
  getErrors,
  getPassportFunnel,
  listAlerts,
  acknowledgeAlert,
};
