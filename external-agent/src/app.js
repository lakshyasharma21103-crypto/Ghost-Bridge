const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { requestTimeout } = require('./middleware/requestTimeout');
const { createAIProvider } = require('./providers');
const { healthRouter } = require('./routes/health.routes');
const { researchRouter } = require('./routes/research.routes');
const { ResearchService } = require('./services/research.service');
const { RuntimeError } = require('./utils/errors');
const { logger: defaultLogger } = require('./utils/logger');

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
  };
}

function createApp({ config, logger = defaultLogger, provider: suppliedProvider }) {
  if (!config?.runtimeToken) throw new Error('External agent runtime configuration is required.');
  const provider = suppliedProvider || createAIProvider(config);
  const researchService = new ResearchService(provider, config);

  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(cors(corsOptions(config.allowedGatewayOrigins || [])));
  app.use(requestTimeout(config.requestTimeoutMs));
  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));
  app.use((request, response, next) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      logger.info(
        {
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        },
        'External agent request completed',
      );
    });
    next();
  });

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

  app.use('/health', healthRouter(provider));
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
