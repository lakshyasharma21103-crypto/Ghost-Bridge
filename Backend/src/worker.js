const { logger } = require('./utils/logger');
const { createDurableWorker, safeWorkerError } = require('./services/durableWorker.service');

async function startWorker(options = {}) {
  const worker = createDurableWorker(options);
  await worker.start();
  return worker;
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
