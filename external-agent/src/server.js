const http = require('node:http');
const { createApp } = require('./app');
const { loadEnvironment } = require('./config/env');
const { logger, safeLogPayload } = require('./utils/logger');
const { redactString } = require('./utils/redact');
const { createServiceLifecycle } = require('./services/serviceLifecycle');

function startupErrorLogFields(error) {
  const isError = error instanceof Error;
  const errorMessage = redactString(isError ? error.message : String(error));
  const errorStack =
    process.env.NODE_ENV === 'production' || !isError || !error.stack
      ? undefined
      : redactString(error.stack);
  const logError = isError ? new Error(errorMessage) : new Error(errorMessage);

  if (isError) {
    logError.name = error.name;
    logError.stack = errorStack;
    if (error.code != null) logError.code = error.code;
  }

  return {
    err: logError,
    errorMessage,
    errorStack,
  };
}

async function start(options = {}) {
  const config = options.config || loadEnvironment();
  const activeLogger = options.logger || logger;
  const lifecycle = options.lifecycle || createServiceLifecycle({ initialReady: false });
  const app = createApp({
    config,
    logger: activeLogger,
    provider: options.provider,
    lifecycle,
  });
  const server = http.createServer(app);
  server.requestTimeout = config.requestTimeoutMs + 1_000;
  server.headersTimeout = Math.max(server.requestTimeout + 1_000, 10_000);
  server.keepAliveTimeout = 5_000;

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, options.host || '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });

  activeLogger.info(
    { port: config.port, environment: config.nodeEnv },
    'External research agent started',
  );
  lifecycle.markReady();

  let shutdownPromise;
  let forced = false;
  async function shutdown(signal = 'manual') {
    if (shutdownPromise) {
      forced = true;
      activeLogger.warn({ signal }, 'Repeated shutdown signal forced external agent termination');
      lifecycle.abortActive();
      server.closeAllConnections?.();
      return shutdownPromise;
    }
    shutdownPromise = (async () => {
      lifecycle.beginDraining();
      const startedAt = Date.now();
      activeLogger.info(
        {
          event: 'service.draining_started',
          signal,
          activeRequests: lifecycle.snapshot().activeRequestCount,
        },
        'External agent shutdown drain started',
      );
      const serverClosed = new Promise((resolve) => server.close(resolve));
      server.closeIdleConnections?.();
      let drained = await lifecycle.waitForIdle(config.shutdownDrainTimeoutMs || 30_000);
      if (!drained) {
        const aborted = lifecycle.abortActive();
        activeLogger.warn({ aborted }, 'External agent shutdown drain deadline exceeded');
        await lifecycle.waitForIdle(1_000);
        server.closeAllConnections?.();
        drained = lifecycle.snapshot().activeRequestCount === 0;
      }
      const drainTimeoutMs = config.shutdownDrainTimeoutMs || 30_000;
      const closeRemainingMs = Math.max(1, drainTimeoutMs - (Date.now() - startedAt));
      let closeTimer;
      const socketsClosed = await Promise.race([
        serverClosed.then(() => true),
        new Promise((resolve) => {
          closeTimer = setTimeout(() => resolve(false), closeRemainingMs);
        }),
      ]);
      clearTimeout(closeTimer);
      if (!socketsClosed) {
        forced = true;
        server.closeAllConnections?.();
        await serverClosed;
      }
      lifecycle.markStopped();
      activeLogger.info(
        {
          event: 'service.draining_completed',
          signal,
          drained,
          forced,
          durationMs: Date.now() - startedAt,
        },
        'External agent shutdown drain completed',
      );
      activeLogger.flush?.();
      return { drained, forced };
    })();
    return shutdownPromise;
  }

  return { app, config, server, shutdown, lifecycle };
}

if (require.main === module) {
  let runtime;
  const stop = (signal, exitCode = 0) => {
    process.exitCode = exitCode;
    runtime?.shutdown(signal).catch((error) => {
      logger.error({ error: safeLogPayload(error) }, 'External agent shutdown failed');
      process.exitCode = 1;
    });
  };

  start()
    .then((started) => {
      runtime = started;
      process.on('SIGTERM', () => stop('SIGTERM'));
      process.on('SIGINT', () => stop('SIGINT'));
      process.on('uncaughtException', (error) => {
        logger.fatal({ error: safeLogPayload(error) }, 'Uncaught exception');
        stop('uncaughtException', 1);
      });
      process.on('unhandledRejection', (reason) => {
        logger.fatal({ reason: safeLogPayload(reason) }, 'Unhandled rejection');
        stop('unhandledRejection', 1);
      });
    })
    .catch((error) => {
      logger.fatal(startupErrorLogFields(error), 'External research agent failed to start');
      process.exitCode = 1;
    });
}

module.exports = {
  start,
  startupErrorLogFields,
};
