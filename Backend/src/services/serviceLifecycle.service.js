const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function createServiceLifecycle() {
  let phase = 'starting';
  const activeInvocations = new Map();
  const idleWaiters = new Set();

  function notifyIdle() {
    if (activeInvocations.size !== 0) return;
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

  function registerInvocation(invocationId, metadata = {}) {
    const controller = new AbortController();
    const entry = {
      invocationId: String(invocationId),
      controller,
      externalCallStarted: false,
      ...metadata,
    };
    activeInvocations.set(entry.invocationId, entry);
    return {
      signal: controller.signal,
      markExternalCallStarted() {
        entry.externalCallStarted = true;
      },
      complete() {
        activeInvocations.delete(entry.invocationId);
        notifyIdle();
      },
    };
  }

  function abortActiveInvocations() {
    let aborted = 0;
    for (const entry of activeInvocations.values()) {
      if (!entry.externalCallStarted || entry.controller.signal.aborted) continue;
      entry.controller.abort(
        new AppError(
          503,
          ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION,
          'Invocation was interrupted while the service was draining.',
          [],
          {
            recoveryRequired: true,
            recoveryReason: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
            reasonCode: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
          },
        ),
      );
      aborted += 1;
    }
    return aborted;
  }

  function waitForIdle(timeoutMs) {
    if (activeInvocations.size === 0) return Promise.resolve(true);
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
      activeInvocationCount: activeInvocations.size,
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
    beginDraining,
    markNotReady,
    markReady,
    markStopped,
    registerInvocation,
    snapshot,
    waitForIdle,
  };
}

const serviceLifecycle = createServiceLifecycle();

module.exports = { createServiceLifecycle, serviceLifecycle };
