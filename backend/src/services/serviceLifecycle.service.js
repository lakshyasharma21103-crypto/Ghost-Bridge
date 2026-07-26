const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

const SAFE_EXECUTION_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const USER_CANCELLATION_REASONS = new Set([
  'USER_REQUESTED',
  'ADMIN_REQUESTED',
  'CLIENT_DISCONNECTED',
]);

function safeExecutionIdentifier(value) {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  return SAFE_EXECUTION_IDENTIFIER.test(normalized) ? normalized : undefined;
}

function safeCancellationReason(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return USER_CANCELLATION_REASONS.has(normalized) ? normalized : 'USER_REQUESTED';
}

function safeEntryMetadata(metadata = {}) {
  return {
    workspaceId: safeExecutionIdentifier(metadata.workspaceId),
    connectionId: safeExecutionIdentifier(metadata.connectionId),
    executionOwner: safeExecutionIdentifier(metadata.executionOwner),
    executionLeaseId: safeExecutionIdentifier(metadata.executionLeaseId),
  };
}

function ownershipMatches(entry, ownership = {}) {
  const expected = safeEntryMetadata(ownership);
  if (
    !expected.workspaceId ||
    !expected.connectionId ||
    entry.workspaceId !== expected.workspaceId ||
    entry.connectionId !== expected.connectionId
  ) {
    return false;
  }
  const executionOwned = Boolean(entry.executionOwner || entry.executionLeaseId);
  if (!executionOwned) {
    // Before an execution lease exists, the invocation/workspace/connection tuple is the
    // authoritative process-local ownership. Once claimed, both lease fields are mandatory.
    return !entry.externalCallStarted;
  }
  return Boolean(
    expected.executionOwner &&
    expected.executionLeaseId &&
    entry.executionOwner === expected.executionOwner &&
    entry.executionLeaseId === expected.executionLeaseId,
  );
}

function userCancellationError(entry, reasonCode, context = {}) {
  const requestId = safeExecutionIdentifier(context.requestId);
  const traceId = safeExecutionIdentifier(context.traceId);
  return new AppError(
    409,
    ErrorCodes.INVOCATION_CANCELLED,
    'Invocation execution was cancelled by the caller.',
    [],
    {
      cancellationState: 'aborting',
      reasonCode,
      ...(requestId ? { requestId } : {}),
      ...(traceId ? { traceId } : {}),
      ...(entry.externalCallStarted
        ? {
            recoveryRequired: true,
            recoveryReason: 'REMOTE_OUTCOME_UNKNOWN',
          }
        : {}),
    },
  );
}

function createServiceLifecycle() {
  let phase = 'starting';
  const activeInvocations = new Map();
  const pendingAdmissions = new Set();
  const idleWaiters = new Set();

  function notifyIdle() {
    if (activeInvocations.size !== 0 || pendingAdmissions.size !== 0) return;
    for (const resolve of idleWaiters) resolve(true);
    idleWaiters.clear();
  }

  function markReady() {
    if (phase !== 'draining' && phase !== 'stopped') phase = 'ready';
  }

  function markNotReady() {
    if (phase === 'ready') phase = 'starting';
  }

  function beginDraining() {
    if (phase === 'stopped') return false;
    const changed = phase !== 'draining';
    phase = 'draining';
    return changed;
  }

  function markStopped() {
    phase = 'stopped';
  }

  function assertAcceptingInvocations() {
    if (phase === 'draining' || phase === 'stopped') {
      throw new AppError(503, ErrorCodes.SERVICE_DRAINING, 'Service is draining.', [], {
        retryAfterMs: 1_000,
        reasonCode: 'SERVICE_DRAINING',
      });
    }
  }

  function beginInvocationAdmission() {
    assertAcceptingInvocations();
    const entry = { controller: new AbortController(), externalCallStarted: false };
    pendingAdmissions.add(entry);
    return {
      signal: entry.controller.signal,
      _entry: entry,
      complete() {
        const removed = pendingAdmissions.delete(entry);
        if (removed) notifyIdle();
        return removed;
      },
    };
  }

  function registerInvocation(invocationId, metadata = {}) {
    const normalizedInvocationId = safeExecutionIdentifier(invocationId);
    if (!normalizedInvocationId) {
      throw new TypeError('invocationId must be a safe execution identifier.');
    }

    const admittedEntry = metadata.admission?._entry;
    if (metadata.admission && !pendingAdmissions.has(admittedEntry)) {
      throw new TypeError('Invocation admission is no longer active.');
    }
    if (!admittedEntry) assertAcceptingInvocations();

    const existing = activeInvocations.get(normalizedInvocationId);
    if (existing) {
      if (admittedEntry) pendingAdmissions.delete(admittedEntry);
      return {
        signal: existing.controller.signal,
        registered: false,
        markExternalCallStarted() {
          return false;
        },
        setExecutionOwnership() {
          return false;
        },
        complete() {
          return false;
        },
      };
    }

    const controller = admittedEntry?.controller || new AbortController();
    const entry = {
      invocationId: normalizedInvocationId,
      controller,
      externalCallStarted: false,
      ...safeEntryMetadata(metadata),
    };
    if (admittedEntry) pendingAdmissions.delete(admittedEntry);
    activeInvocations.set(entry.invocationId, entry);
    return {
      signal: controller.signal,
      registered: true,
      markExternalCallStarted() {
        if (activeInvocations.get(entry.invocationId) !== entry) return false;
        entry.externalCallStarted = true;
        return true;
      },
      setExecutionOwnership(ownership = {}) {
        if (activeInvocations.get(entry.invocationId) !== entry) return false;
        const safeOwnership = safeEntryMetadata(ownership);
        if (!safeOwnership.executionOwner || !safeOwnership.executionLeaseId) return false;
        entry.executionOwner = safeOwnership.executionOwner;
        entry.executionLeaseId = safeOwnership.executionLeaseId;
        if (safeOwnership.workspaceId) entry.workspaceId = safeOwnership.workspaceId;
        if (safeOwnership.connectionId) entry.connectionId = safeOwnership.connectionId;
        return true;
      },
      complete() {
        if (activeInvocations.get(entry.invocationId) !== entry) return false;
        activeInvocations.delete(entry.invocationId);
        notifyIdle();
        return true;
      },
    };
  }

  function requestCancellation(invocationId, ownership = {}, options = {}) {
    const normalizedInvocationId = safeExecutionIdentifier(invocationId);
    const entry = normalizedInvocationId
      ? activeInvocations.get(normalizedInvocationId)
      : undefined;
    if (!entry) {
      return {
        found: false,
        requested: false,
        accepted: false,
        alreadyRequested: false,
        cancellationState: 'rejected',
        reasonCode: 'ACTIVE_EXECUTION_NOT_FOUND',
      };
    }
    if (!ownershipMatches(entry, ownership)) {
      return {
        found: true,
        requested: false,
        accepted: false,
        alreadyRequested: false,
        cancellationState: 'rejected',
        reasonCode: 'EXECUTION_OWNERSHIP_MISMATCH',
      };
    }

    if (entry.controller.signal.aborted) {
      const userCancellation =
        entry.controller.signal.reason?.code === ErrorCodes.INVOCATION_CANCELLED;
      return {
        found: true,
        requested: userCancellation,
        accepted: userCancellation,
        alreadyRequested: true,
        cancellationState: userCancellation ? 'aborting' : 'rejected',
        reasonCode:
          entry.controller.signal.reason?.reasonCode ||
          (userCancellation ? 'USER_REQUESTED' : 'SERVICE_SHUTDOWN'),
        externalCallStarted: entry.externalCallStarted,
      };
    }

    const reasonCode = safeCancellationReason(ownership.reasonCode || options.reasonCode);
    entry.controller.abort(userCancellationError(entry, reasonCode, ownership));
    return {
      found: true,
      requested: true,
      accepted: true,
      alreadyRequested: false,
      cancellationState: 'aborting',
      reasonCode,
      externalCallStarted: entry.externalCallStarted,
    };
  }

  function abortActiveInvocations() {
    let aborted = 0;
    for (const entry of [...pendingAdmissions, ...activeInvocations.values()]) {
      if (entry.controller.signal.aborted) continue;
      entry.controller.abort(
        new AppError(
          503,
          ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION,
          'Invocation was interrupted while the service was draining.',
          [],
          entry.externalCallStarted
            ? {
                recoveryRequired: true,
                recoveryReason: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
                reasonCode: 'SERVICE_SHUTDOWN',
              }
            : {
                recoveryRequired: false,
                reasonCode: 'SERVICE_SHUTDOWN',
              },
        ),
      );
      aborted += 1;
    }
    return aborted;
  }

  function waitForIdle(timeoutMs) {
    if (activeInvocations.size === 0 && pendingAdmissions.size === 0) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      let settled = false;
      let timer;
      const finish = (idle) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        idleWaiters.delete(onIdle);
        resolve(idle);
      };
      const onIdle = () => finish(true);
      idleWaiters.add(onIdle);
      timer = setTimeout(() => finish(false), timeoutMs);
    });
  }

  function snapshot() {
    return {
      phase,
      ready: phase === 'ready',
      draining: phase === 'draining',
      activeInvocationCount: activeInvocations.size + pendingAdmissions.size,
      pendingAdmissionCount: pendingAdmissions.size,
      activeInvocations: [...activeInvocations.values()].map((entry) => ({
        invocationId: entry.invocationId,
        workspaceId: entry.workspaceId,
        connectionId: entry.connectionId,
        externalCallStarted: entry.externalCallStarted,
      })),
    };
  }

  return {
    abortActiveInvocations,
    assertAcceptingInvocations,
    beginInvocationAdmission,
    beginDraining,
    markNotReady,
    markReady,
    markStopped,
    registerInvocation,
    requestCancellation,
    snapshot,
    waitForIdle,
  };
}

const serviceLifecycle = createServiceLifecycle();

module.exports = { createServiceLifecycle, serviceLifecycle };
