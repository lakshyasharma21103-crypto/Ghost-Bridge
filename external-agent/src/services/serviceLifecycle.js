const { RuntimeError } = require('../utils/errors');

function createServiceLifecycle({ initialReady = true } = {}) {
  let phase = initialReady ? 'ready' : 'starting';
  const active = new Map();
  const idleWaiters = new Set();

  function notifyIdle() {
    if (active.size) return;
    for (const resolve of idleWaiters) resolve(true);
    idleWaiters.clear();
  }

  function markReady() {
    if (!['draining', 'stopped'].includes(phase)) phase = 'ready';
  }

  function beginDraining() {
    const changed = phase !== 'draining' && phase !== 'stopped';
    if (phase !== 'stopped') phase = 'draining';
    return changed;
  }

  function markStopped() {
    phase = 'stopped';
  }

  function assertAccepting() {
    if (phase === 'draining' || phase === 'stopped') {
      throw new RuntimeError(503, 'SERVICE_DRAINING', 'Service is draining.', [], {
        retryAfterMs: 1_000,
        reason: 'SERVICE_DRAINING',
      });
    }
  }

  function register(requestId) {
    assertAccepting();
    const controller = new AbortController();
    const key = String(requestId);
    active.set(key, { requestId: key, controller });
    return {
      signal: controller.signal,
      complete() {
        active.delete(key);
        notifyIdle();
      },
    };
  }

  function abortActive() {
    let aborted = 0;
    for (const entry of active.values()) {
      if (entry.controller.signal.aborted) continue;
      entry.controller.abort(
        new RuntimeError(
          503,
          'SHUTDOWN_INTERRUPTED_INVOCATION',
          'Research invocation was interrupted while the service was draining.',
          [],
          {
            retryAfterMs: 1_000,
            reason: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
            recoveryRequired: true,
            recoveryReason: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
          },
        ),
      );
      aborted += 1;
    }
    return aborted;
  }

  function waitForIdle(timeoutMs) {
    if (!active.size) return Promise.resolve(true);
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
      activeRequestCount: active.size,
    };
  }

  return {
    abortActive,
    assertAccepting,
    beginDraining,
    markReady,
    markStopped,
    register,
    snapshot,
    waitForIdle,
  };
}

module.exports = { createServiceLifecycle };
