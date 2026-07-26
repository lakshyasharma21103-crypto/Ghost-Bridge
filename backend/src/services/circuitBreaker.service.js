const crypto = require('node:crypto');
const mongoose = require('mongoose');
const CircuitBreaker = require('../models/CircuitBreaker');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { classifyCircuitFailure } = require('../utils/circuitFailure');
const { isDuplicateKeyError } = require('../utils/idempotency');

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function runtimeIdentityHash(connection) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(`${connection.runtimeType}:${connection.runtimeEndpoint || ''}`)
    .digest('hex')}`;
}

function breakerScope(connection, capabilityName) {
  return {
    workspaceId: connection.receivingWorkspaceId,
    connectionId: connection._id,
    runtimeType: connection.runtimeType,
    runtimeIdentityHash: runtimeIdentityHash(connection),
    capabilityName: String(capabilityName || 'runtime').trim(),
  };
}

function persistenceAvailable(options = {}) {
  return options.forcePersistence === true || mongoose.connection.readyState === 1;
}

async function ensureBreaker(scope) {
  try {
    return await CircuitBreaker.findOneAndUpdate(
      scope,
      {
        $setOnInsert: {
          ...scope,
          state: 'closed',
          consecutiveFailureCount: 0,
          successCountSinceClose: 0,
          failureCountInWindow: 0,
          halfOpenProbeInFlight: false,
          halfOpenProbesInFlight: 0,
          halfOpenProbeCount: 0,
          version: 0,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return CircuitBreaker.findOne(scope);
  }
}

function retryAfterMs(until, now) {
  if (!until) return 0;
  return Math.max(0, new Date(until).getTime() - now.getTime());
}

function protectionError(statusCode, code, message, breaker, now) {
  const until =
    code === ErrorCodes.RATE_LIMIT_PROTECTED ? breaker.rateLimitedUntil : breaker.openUntil;
  return new AppError(statusCode, code, message, [], {
    retryAfterMs: retryAfterMs(until, now),
    circuitState: breaker.state,
    connectionId: idOf(breaker.connectionId),
  });
}

async function evaluateCircuit(connection, capabilityName, options = {}) {
  if (!env.CIRCUIT_BREAKER_ENABLED || !persistenceAvailable(options)) {
    return { allowed: true, bypassed: true, state: 'closed', probe: false };
  }
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const scope = breakerScope(connection, capabilityName);
  let breaker = await ensureBreaker(scope);

  if (breaker.rateLimitedUntil && new Date(breaker.rateLimitedUntil) > now) {
    throw protectionError(
      429,
      ErrorCodes.RATE_LIMIT_PROTECTED,
      'Runtime rate-limit protection is active.',
      breaker,
      now,
    );
  }
  if (breaker.state === 'open' && breaker.openUntil && new Date(breaker.openUntil) > now) {
    throw protectionError(503, ErrorCodes.CIRCUIT_OPEN, 'Runtime circuit is open.', breaker, now);
  }

  if (breaker.state === 'open') {
    const claimed = await CircuitBreaker.findOneAndUpdate(
      {
        _id: breaker._id,
        version: breaker.version,
        state: 'open',
        openUntil: { $lte: now },
        halfOpenProbeInFlight: { $ne: true },
      },
      {
        $set: { state: 'half_open', halfOpenProbeInFlight: true, halfOpenProbesInFlight: 1 },
        $inc: { halfOpenProbeCount: 1, version: 1 },
      },
      { new: true, runValidators: true },
    );
    if (claimed) {
      return {
        allowed: true,
        state: 'half_open',
        probe: true,
        breaker: claimed,
        transitioned: 'half_opened',
      };
    }
    breaker = await CircuitBreaker.findOne(scope);
  }

  if (breaker.state === 'half_open') {
    const probesInFlight = Number(
      breaker.halfOpenProbesInFlight || (breaker.halfOpenProbeInFlight ? 1 : 0),
    );
    if (
      probesInFlight > 0 &&
      (probesInFlight >= env.CIRCUIT_HALF_OPEN_MAX_PROBES ||
        Number(breaker.successCountSinceClose || 0) >= env.CIRCUIT_SUCCESS_THRESHOLD_TO_CLOSE)
    ) {
      throw protectionError(
        503,
        ErrorCodes.CIRCUIT_HALF_OPEN_PROBE_ACTIVE,
        'A runtime circuit recovery probe is already active.',
        breaker,
        now,
      );
    }
    const claimed = await CircuitBreaker.findOneAndUpdate(
      {
        _id: breaker._id,
        version: breaker.version,
        state: 'half_open',
        $or: [
          { halfOpenProbesInFlight: { $exists: false } },
          { halfOpenProbesInFlight: { $lt: env.CIRCUIT_HALF_OPEN_MAX_PROBES } },
        ],
      },
      {
        $set: { halfOpenProbeInFlight: true },
        $inc: { halfOpenProbeCount: 1, halfOpenProbesInFlight: 1, version: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!claimed) {
      throw protectionError(
        503,
        ErrorCodes.CIRCUIT_HALF_OPEN_PROBE_ACTIVE,
        'A runtime circuit recovery probe is already active.',
        breaker,
        now,
      );
    }
    return { allowed: true, state: 'half_open', probe: true, breaker: claimed };
  }

  return { allowed: true, state: 'closed', probe: false, breaker };
}

async function recordCircuitSuccess(connection, capabilityName, options = {}) {
  if (!env.CIRCUIT_BREAKER_ENABLED || !persistenceAvailable(options)) return { changed: false };
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const scope = breakerScope(connection, capabilityName);
  for (let retry = 0; retry < 4; retry += 1) {
    const breaker = await ensureBreaker(scope);
    if (breaker.state === 'open') return { changed: false, state: 'open' };
    const wasHalfOpen = breaker.state === 'half_open';
    const probesInFlight = Number(
      breaker.halfOpenProbesInFlight || (breaker.halfOpenProbeInFlight ? 1 : 0),
    );
    const remainingProbes = wasHalfOpen ? Math.max(0, probesInFlight - 1) : 0;
    const successCount = Number(breaker.successCountSinceClose || 0) + 1;
    const closes =
      wasHalfOpen &&
      successCount >= env.CIRCUIT_SUCCESS_THRESHOLD_TO_CLOSE &&
      remainingProbes === 0;
    const updated = await CircuitBreaker.findOneAndUpdate(
      { _id: breaker._id, version: breaker.version },
      {
        $set: {
          state: closes ? 'closed' : breaker.state,
          consecutiveFailureCount: 0,
          successCountSinceClose: successCount,
          failureCountInWindow: 0,
          failureWindowStartedAt: now,
          lastSuccessAt: now,
          halfOpenProbeInFlight: wasHalfOpen && remainingProbes > 0,
          halfOpenProbesInFlight: remainingProbes,
          ...(closes || breaker.state === 'closed' ? { openUntil: null } : {}),
          ...(breaker.rateLimitedUntil ? { rateLimitedUntil: null } : {}),
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    );
    if (updated) {
      return {
        changed: true,
        state: updated.state,
        transitioned: closes ? 'closed' : undefined,
        rateLimitCleared: Boolean(breaker.rateLimitedUntil),
      };
    }
  }
  throw new AppError(
    503,
    ErrorCodes.SERVICE_UNAVAILABLE,
    'Circuit success state could not be updated safely.',
  );
}

async function releaseCircuitProbe(connection, capabilityName, options = {}) {
  if (!env.CIRCUIT_BREAKER_ENABLED || !persistenceAvailable(options)) return { changed: false };
  const scope = breakerScope(connection, capabilityName);
  for (let retry = 0; retry < 4; retry += 1) {
    const breaker = await ensureBreaker(scope);
    const probesInFlight = Number(
      breaker.halfOpenProbesInFlight || (breaker.halfOpenProbeInFlight ? 1 : 0),
    );
    if (breaker.state !== 'half_open' || probesInFlight < 1) {
      return { changed: false, state: breaker.state };
    }
    const remainingProbes = Math.max(0, probesInFlight - 1);
    const updated = await CircuitBreaker.findOneAndUpdate(
      { _id: breaker._id, version: breaker.version, state: 'half_open' },
      {
        $set: {
          halfOpenProbeInFlight: remainingProbes > 0,
          halfOpenProbesInFlight: remainingProbes,
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    );
    if (updated) {
      return { changed: true, state: updated.state, remainingProbes };
    }
  }
  throw new AppError(
    503,
    ErrorCodes.SERVICE_UNAVAILABLE,
    'Circuit probe state could not be released safely.',
  );
}

async function recordRateLimit(scope, errorMetadata, now) {
  const fallback = env.CIRCUIT_OPEN_DURATION_MS;
  const supplied = Number(errorMetadata.retryAfterMs);
  const durationMs = Number.isInteger(supplied) && supplied > 0 ? supplied : fallback;
  const boundedDurationMs = Math.min(3_600_000, Math.max(1_000, durationMs));
  const rateLimitedUntil = new Date(now.getTime() + boundedDurationMs);
  const current = await ensureBreaker(scope);
  const breaker = await CircuitBreaker.findOneAndUpdate(
    { _id: current._id },
    {
      $max: { rateLimitedUntil },
      $set: {
        lastFailureAt: now,
        lastErrorCode: String(errorMetadata.code || 'RATE_LIMITED').toUpperCase(),
        lastProviderHttpStatus: 429,
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true },
  );
  return { changed: true, rateLimited: true, rateLimitedUntil: breaker.rateLimitedUntil };
}

async function recordCircuitFailure(connection, capabilityName, errorMetadata = {}, options = {}) {
  const classification = classifyCircuitFailure(errorMetadata);
  if (!env.CIRCUIT_BREAKER_ENABLED || !persistenceAvailable(options)) {
    return { changed: false, classification };
  }
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const scope = breakerScope(connection, capabilityName);
  if (classification.rateLimited) {
    return { ...(await recordRateLimit(scope, errorMetadata, now)), classification };
  }
  if (!classification.countsTowardCircuit) return { changed: false, classification };

  for (let retry = 0; retry < 4; retry += 1) {
    const breaker = await ensureBreaker(scope);
    const windowActive =
      breaker.failureWindowStartedAt &&
      now.getTime() - new Date(breaker.failureWindowStartedAt).getTime() <=
        env.CIRCUIT_FAILURE_WINDOW_MS;
    const failureCountInWindow =
      (windowActive ? Number(breaker.failureCountInWindow || 0) : 0) + classification.weight;
    const shouldOpen =
      breaker.state === 'half_open' || failureCountInWindow >= env.CIRCUIT_FAILURE_THRESHOLD;
    const update = await CircuitBreaker.findOneAndUpdate(
      { _id: breaker._id, version: breaker.version },
      {
        $set: {
          state: shouldOpen ? 'open' : 'closed',
          consecutiveFailureCount:
            Number(breaker.consecutiveFailureCount || 0) + classification.weight,
          failureCountInWindow,
          failureWindowStartedAt: windowActive ? breaker.failureWindowStartedAt : now,
          lastFailureAt: now,
          lastErrorCode: String(errorMetadata.code || classification.reason).toUpperCase(),
          ...(errorMetadata.stage
            ? { lastFailureStage: String(errorMetadata.stage).slice(0, 128) }
            : {}),
          ...(Number.isInteger(Number(errorMetadata.providerHttpStatus))
            ? { lastProviderHttpStatus: Number(errorMetadata.providerHttpStatus) }
            : {}),
          halfOpenProbeInFlight: false,
          halfOpenProbesInFlight: 0,
          ...(shouldOpen
            ? {
                openedAt: now,
                openUntil: new Date(now.getTime() + env.CIRCUIT_OPEN_DURATION_MS),
                successCountSinceClose: 0,
              }
            : {}),
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    );
    if (update) {
      return {
        changed: true,
        classification,
        state: update.state,
        transitioned: shouldOpen && breaker.state !== 'open' ? 'opened' : undefined,
        reopened: shouldOpen && breaker.state === 'half_open',
        openUntil: update.openUntil,
      };
    }
  }
  throw new AppError(
    503,
    ErrorCodes.SERVICE_UNAVAILABLE,
    'Circuit state could not be updated safely.',
  );
}

module.exports = {
  breakerScope,
  evaluateCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
  releaseCircuitProbe,
  retryAfterMs,
  runtimeIdentityHash,
};
