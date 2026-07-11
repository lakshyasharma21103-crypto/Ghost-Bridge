const http = require('node:http');
const { createApp } = require('./app');
const { loadEnvironment } = require('./config/env');
const { logger, safeLogPayload } = require('./utils/logger');
const { redactString } = require('./utils/redact');

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
  const app = createApp({ config, logger: activeLogger });
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

  let shuttingDown = false;
  async function shutdown(signal = 'manual') {
    if (shuttingDown) return;
    shuttingDown = true;
    activeLogger.info({ signal }, 'Shutting down external research agent');

    await new Promise((resolve) => {
      const forceTimer = setTimeout(() => {
        server.closeAllConnections?.();
        resolve();
      }, 10_000);
      forceTimer.unref();
      server.close(() => {
        clearTimeout(forceTimer);
        resolve();
      });
    });
    activeLogger.flush?.();
  }

  return { app, config, server, shutdown };
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
