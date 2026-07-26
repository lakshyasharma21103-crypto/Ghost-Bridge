const CacheInvalidationEvent = require('../models/CacheInvalidationEvent');
const { cacheAdapter } = require('./dataAccessPerformance.service');
const { processInvalidationBatch } = require('./dataAccessProjection.service');
const { cleanupPerformanceRetention } = require('./dataAccessRetention.service');

function createDataAccessWorker(options = {}) {
  const workerId = options.workerId || `data-access-${process.pid}`;
  const pollIntervalMs = Math.max(100, Math.min(Number(options.pollIntervalMs || 1_000), 60_000));
  let timer;
  let running = false;
  let active;
  let processed = 0;
  let failures = 0;
  let ticks = 0;
  let retentionRuns = 0;

  async function tick() {
    if (!running || active) return;
    active = (async () => {
      const results = await processInvalidationBatch({
        CacheInvalidationEvent: options.CacheInvalidationEvent || CacheInvalidationEvent,
        cacheAdapter: options.cacheAdapter || cacheAdapter,
        workerId,
        maximumBatchSize: options.maximumBatchSize || 25,
        maximumAttempts: options.maximumAttempts || 5,
        leaseMs: options.leaseMs || 30_000,
      });
      processed += results.filter(Boolean).length;
      ticks += 1;
      const retentionEveryTicks = Math.max(1, Math.min(Number(options.retentionEveryTicks || 60), 86_400));
      if (options.retentionEnabled !== false && ticks % retentionEveryTicks === 0) {
        await (options.cleanupRetention || cleanupPerformanceRetention)(options.retentionOptions || {});
        retentionRuns += 1;
      }
    })();
    try {
      await active;
    } catch {
      failures += 1;
    } finally {
      active = null;
    }
  }

  return {
    async start() {
      if (running) return;
      running = true;
      if (options.immediate === true) await tick();
      timer = setInterval(() => { void tick(); }, pollIntervalMs);
      timer.unref?.();
    },
    snapshot() { return { workerId, status: running ? 'running' : 'stopped', processed, failures, retentionRuns, active: Boolean(active) }; },
    async shutdown() {
      running = false;
      clearInterval(timer);
      if (active) await active;
      return { drained: true, forced: false, processed, failures };
    },
  };
}

module.exports = { createDataAccessWorker };
