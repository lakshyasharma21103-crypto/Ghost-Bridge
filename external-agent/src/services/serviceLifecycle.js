const { RuntimeError, serviceShutdownError } = require('../utils/errors');

const SAFE_IDENTIFIER = /^(?:req_|trace_)?[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const FORBIDDEN_IDENTIFIER = /^(?:agentpass_(?:install|partner)_|Bearer\b)/i;

function safeIdentifier(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return SAFE_IDENTIFIER.test(candidate) && !FORBIDDEN_IDENTIFIER.test(candidate)
    ? candidate
    : undefined;
}

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

  function register(registration = {}) {
    assertAccepting();
    const metadata =
      registration && typeof registration === 'object' ? registration : { requestId: registration };
    const controller = new AbortController();
    const key = Symbol('active-request');
    const entry = {
      controller,
      invocationId: safeIdentifier(metadata.invocationId),
      registeredAt: Date.now(),
      requestId: safeIdentifier(metadata.requestId),
      traceId: safeIdentifier(metadata.traceId),
    };
    active.set(key, entry);
    return {
      signal: controller.signal,
      complete() {
        if (active.get(key) !== entry) return false;
        active.delete(key);
        notifyIdle();
        return true;
      },
    };
  }

  function abortActive() {
    let aborted = 0;
    for (const entry of active.values()) {
      if (entry.controller.signal.aborted) continue;
      entry.controller.abort(serviceShutdownError());
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
