const http = require('node:http');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { logger, safeLogPayload } = require('./utils/logger');

async function start() {
  let shuttingDown = false;

  const app = createApp();
  const server = http.createServer(app);

  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down Agent Passport Runtime Gateway backend');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(exitCode);
    });
  }

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      logger.fatal({ port: env.PORT }, 'Backend port is already in use');
      void shutdown('server-error', 1);
      return;
    }

    logger.fatal({ error: safeLogPayload(error) }, 'Backend server failed');
    void shutdown('server-error', 1);
  });

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Agent Passport Runtime Gateway backend started');
    connectDatabase().catch((error) => {
      logger.error({ error: safeLogPayload(error) }, 'Background database connection failed');
    });
  });

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.fatal({ error: safeLogPayload(error) }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason: safeLogPayload(reason) }, 'Unhandled rejection');
    void shutdown('unhandledRejection', 1);
  });
}

if (require.main === module) {
  start().catch((error) => {
    logger.fatal({ error: safeLogPayload(error) }, 'Failed to start backend');
    process.exit(1);
  });
}

module.exports = {
  start,
};
