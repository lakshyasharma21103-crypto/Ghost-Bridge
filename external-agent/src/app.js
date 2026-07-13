const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { requestTimeout } = require('./middleware/requestTimeout');
const { createAIProvider } = require('./providers');
const { healthRouter, readinessHandler } = require('./routes/health.routes');
const { researchRouter } = require('./routes/research.routes');
const { ResearchService } = require('./services/research.service');
const { RuntimeError } = require('./utils/errors');
const { logger: defaultLogger } = require('./utils/logger');
const { createObserver } = require('./utils/observability');
const { performance } = require('node:perf_hooks');

function corsOptions(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new RuntimeError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'));
    },
    exposedHeaders: ['X-Trace-Id', 'X-Request-Id'],
  };
}

function createApp({ config, logger = defaultLogger, provider: suppliedProvider }) {
  if (!config?.runtimeToken) throw new Error('External agent runtime configuration is required.');
  const provider = suppliedProvider || createAIProvider(config, { logger });
  const researchService = new ResearchService(provider, config);

  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use((request, response, next) => {
    const startedAt = performance.now();
    request.observer = createObserver(
      {
        environment: config.nodeEnv,
        traceId: request.traceId,
        requestId: request.requestId,
        invocationId: request.invocationId,
      },
      logger,
    );
    request.observer.emit('info', 'request.received', {
      method: request.method,
      path: request.path,
      status: 'received',
    });
    response.on('finish', () => {
      request.observer.emit('info', 'request.completed', {
        method: request.method,
        path: request.path,
        status: response.statusCode >= 400 ? 'failed' : 'completed',
        statusCode: response.statusCode,
        durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
      });
    });
    next();
  });
  app.use(helmet());
  app.use(cors(corsOptions(config.allowedGatewayOrigins || [])));
  app.use(requestTimeout(config.requestTimeoutMs));
  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));

  app.use(
    '/v1',
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler(request, _response, next) {
        next(
          new RuntimeError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests.', [
            { path: 'request', message: 'Retry after the rate-limit window resets.' },
          ]),
        );
      },
    }),
  );

  app.use('/health', healthRouter(provider, config));
  app.get('/ready', readinessHandler(provider, config));
  app.use('/v1/research', researchRouter(config.runtimeToken, researchService));
  app.use((_request, _response, next) => {
    next(new RuntimeError(404, 'NOT_FOUND', 'Route not found.'));
  });
  app.use(errorHandler(logger));

  return app;
}

module.exports = {
  corsOptions,
  createApp,
};
