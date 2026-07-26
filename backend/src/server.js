const http = require('node:http');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { logger, safeLogPayload } = require('./utils/logger');
const { databaseStatus } = require('./config/db');
const { serviceLifecycle } = require('./services/serviceLifecycle.service');
const { markActiveInvocationRecovery } = require('./services/invocationLifecycle.service');
const { createAuditLog } = require('./services/auditService');
const { ensureDurableIndexes } = require('./services/durableWork.service');
const { ensureOrchestrationIndexes } = require('./services/orchestration.service');
const { ensureAgentSelectionIndexes } = require('./services/agentSelection.service');
const {
  ensureInterAgentDelegationIndexes,
} = require('./services/interAgentDelegation.service');
const { ensureProductionScaleIndexes } = require('./services/productionScaleOperations.service');
const dataAccessPerformance = require('./services/dataAccessPerformance.service');
const { ensureReleaseReadinessIndexes } = require('./services/releaseReadiness.service');
const { ensureStagingPilotIndexes } = require('./services/stagingPilot.service');
const { ensurePilotAnalyticsIndexes } = require('./services/pilotAnalytics.service');
const { ensureGaCommercialIndexes } = require('./services/gaCommercial.service');
const { assertStartupConfiguration } = require('./config/productionProfile');

async function start(options = {}) {
  if (env.NODE_ENV === 'production') {
    assertStartupConfiguration(options.environment || process.env, {
      defaultEnvironment: env.NODE_ENV,
    });
  }
  const activeLogger = options.logger || logger;
  const lifecycle = options.lifecycle || serviceLifecycle;
  const connect = options.connectDatabase || connectDatabase;
  const disconnect = options.disconnectDatabase || disconnectDatabase;
  const currentDatabaseStatus = options.databaseStatus || databaseStatus;
  const ensureIndexes = options.ensureDurableIndexes || ensureDurableIndexes;
  const app = createApp({ lifecycle });
  const server = http.createServer(app);
  let shutdownPromise;
  let forced = false;

  async function shutdown(signal = 'manual', exitCode = 0) {
    if (shutdownPromise) {
      forced = true;
      activeLogger.warn({ signal }, 'Repeated shutdown signal forced backend termination');
      lifecycle.abortActiveInvocations();
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
          activeInvocations: lifecycle.snapshot().activeInvocationCount,
        },
        'Backend shutdown drain started',
      );
      const serverClosed = new Promise((resolve) => server.close(resolve));
      server.closeIdleConnections?.();
      let drained = await lifecycle.waitForIdle(env.SHUTDOWN_DRAIN_TIMEOUT_MS);
      if (!drained) {
        const aborted = lifecycle.abortActiveInvocations();
        activeLogger.warn({ aborted }, 'Backend shutdown drain deadline exceeded');
        await lifecycle.waitForIdle(1_000);
        for (const entry of lifecycle.snapshot().activeInvocations) {
          if (!entry.externalCallStarted) continue;
          try {
            await markActiveInvocationRecovery({
              invocationId: entry.invocationId,
              receivingWorkspaceId: entry.workspaceId,
              reasonCode: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
              onRecoveryRequired: (invocation, metadata) =>
                createAuditLog(
                  'system',
                  'system:backend-shutdown',
                  'invocation.recovery.eligible',
                  'Invocation',
                  entry.invocationId,
                  {
                    receivingWorkspaceId: entry.workspaceId,
                    connectionId: entry.connectionId,
                    invocationId: entry.invocationId,
                    lifecycleState: invocation.lifecycleState,
                    ...metadata,
                  },
                  {
                    requestId: invocation.requestId,
                    traceId: invocation.traceId,
                    invocationId: entry.invocationId,
                  },
                ),
            });
          } catch (error) {
            activeLogger.error(
              { error: safeLogPayload(error), invocationId: entry.invocationId },
              'Interrupted invocation recovery persistence failed',
            );
          }
        }
        server.closeAllConnections?.();
        drained = lifecycle.snapshot().activeInvocationCount === 0;
      }
      const closeRemainingMs = Math.max(
        1,
        env.SHUTDOWN_DRAIN_TIMEOUT_MS - (Date.now() - startedAt),
      );
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
      if (!options.connectDatabase) await dataAccessPerformance.closeCache();
      await disconnect();
      lifecycle.markStopped();
      activeLogger.info(
        {
          event: 'service.draining_completed',
          signal,
          drained,
          forced,
          durationMs: Date.now() - startedAt,
        },
        'Backend shutdown drain completed',
      );
      return { exitCode: forced ? 1 : exitCode, drained, forced };
    })();
    return shutdownPromise;
  }

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      activeLogger.fatal({ port: env.PORT }, 'Backend port is already in use');
      void shutdown('server-error', 1);
      return;
    }

    activeLogger.fatal({ error: safeLogPayload(error) }, 'Backend server failed');
    void shutdown('server-error', 1);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? env.PORT, options.host || '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });
  activeLogger.info(
    { port: options.port ?? env.PORT },
    'Agent Passport Runtime Gateway backend started',
  );
  try {
    await connect();
    if (currentDatabaseStatus() === 'connected') {
      await ensureIndexes();
      await ensureOrchestrationIndexes();
      await ensureAgentSelectionIndexes();
      await ensureInterAgentDelegationIndexes();
      await ensureProductionScaleIndexes();
      await ensureReleaseReadinessIndexes();
      await ensureStagingPilotIndexes();
      await ensurePilotAnalyticsIndexes();
      await ensureGaCommercialIndexes();
      dataAccessPerformance.timeoutHierarchy();
      await dataAccessPerformance.recordIndexDriftSnapshot();
      lifecycle.markReady();
      if (!options.connectDatabase) {
        const { resumePendingEvidenceExports } = require('./services/evidence.service');
        const { resumeAdministrativeJobs } = require('./services/enterpriseOperations.service');
        void resumePendingEvidenceExports().catch((error) =>
          activeLogger.error(
            { error: safeLogPayload(error), event: 'evidence.export_recovery_failed' },
            'Evidence export recovery failed',
          ),
        );
        void resumeAdministrativeJobs().catch((error) =>
          activeLogger.error(
            { error: safeLogPayload(error), event: 'enterprise_operations_recovery_failed' },
            'Enterprise administrative job recovery failed',
          ),
        );
      }
    } else if (options.connectDatabase) {
      lifecycle.markReady();
    }
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    try {
      await disconnect();
    } catch (disconnectError) {
      activeLogger.error(
        { error: safeLogPayload(disconnectError) },
        'Backend database cleanup after startup failure failed',
      );
    }
    lifecycle.markStopped();
    throw error;
  }

  return { app, server, shutdown, lifecycle };
}

if (require.main === module) {
  let runtime;
  const stop = (signal, exitCode = 0) => {
    process.exitCode = exitCode;
    runtime
      ?.shutdown(signal, exitCode)
      .then((result) => {
        process.exitCode = result.exitCode;
      })
      .catch((error) => {
        logger.error({ error: safeLogPayload(error) }, 'Backend shutdown failed');
        process.exitCode = 1;
      });
  };
  start()
    .catch((error) => {
      logger.fatal({ error: safeLogPayload(error) }, 'Failed to start backend');
      process.exitCode = 1;
    })
    .then((started) => {
      if (!started) return;
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
    });
}

module.exports = {
  start,
};
