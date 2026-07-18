const { logger } = require('./utils/logger');
const { createDurableWorker, safeWorkerError } = require('./services/durableWorker.service');
const { createOrchestrationWorker } = require('./services/orchestrationScheduler.service');
const { env } = require('./config/env');

async function startWorker(options = {}) {
  const durableWorker = createDurableWorker(options.durable || options);
  await durableWorker.start();
  const orchestrationWorker = env.ORCHESTRATION_WORKER_ENABLED
    ? createOrchestrationWorker({
        ...(options.orchestration || {}),
        manageDatabase: false,
      })
    : null;
  try {
    if (orchestrationWorker) await orchestrationWorker.start();
  } catch (error) {
    await durableWorker.shutdown('ORCHESTRATION_WORKER_START_FAILED');
    throw error;
  }
  return {
    abortActive(reasonCode) {
      return (
        durableWorker.abortActive(reasonCode) +
        (orchestrationWorker?.abortActive(reasonCode) || 0)
      );
    },
    snapshot() {
      return {
        durable: durableWorker.snapshot(),
        orchestration: orchestrationWorker?.snapshot() || {
          status: 'disabled',
          ready: true,
          acceptingClaims: false,
          activeNodeCount: 0,
        },
      };
    },
    async shutdown(signal) {
      const orchestration = orchestrationWorker
        ? await orchestrationWorker.shutdown(signal)
        : { drained: true, forced: false };
      const durable = await durableWorker.shutdown(signal);
      return {
        drained: orchestration.drained && durable.drained,
        forced: orchestration.forced || durable.forced,
        orchestration,
        durable,
      };
    },
  };
}

if (require.main === module) {
  let worker;
  let stopping = false;

  const stop = (signal, exitCode = 0) => {
    process.exitCode = exitCode;
    if (!worker) return;
    if (stopping) {
      worker.abortActive('DURABLE_WORKER_REPEATED_SHUTDOWN_SIGNAL');
      return;
    }
    stopping = true;
    worker
      .shutdown(signal)
      .then((result) => {
        if (result.forced) process.exitCode = 1;
        if (result.forced && !result.drained) process.exit(1);
      })
      .catch((error) => {
        logger.error(
          { event: 'durable_worker.shutdown_failed', ...safeWorkerError(error) },
          'Durable worker shutdown failed',
        );
        process.exitCode = 1;
      });
  };

  startWorker()
    .then((started) => {
      worker = started;
      process.on('SIGTERM', () => stop('SIGTERM'));
      process.on('SIGINT', () => stop('SIGINT'));
      process.on('uncaughtException', (error) => {
        logger.fatal(
          { event: 'durable_worker.uncaught_exception', ...safeWorkerError(error) },
          'Durable worker encountered an uncaught exception',
        );
        stop('uncaughtException', 1);
      });
      process.on('unhandledRejection', (error) => {
        logger.fatal(
          { event: 'durable_worker.unhandled_rejection', ...safeWorkerError(error) },
          'Durable worker encountered an unhandled rejection',
        );
        stop('unhandledRejection', 1);
      });
    })
    .catch((error) => {
      logger.fatal(
        { event: 'durable_worker.start_failed', ...safeWorkerError(error) },
        'Failed to start durable worker',
      );
      process.exitCode = 1;
    });
}

module.exports = { startWorker };
