const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { env } = require('./config/env');
const { corsOptions, helmetOptions } = require('./config/security');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const { requestId } = require('./middleware/requestId');
const { router } = require('./routes');
const { createObserver } = require('./utils/observability');
const { performance } = require('node:perf_hooks');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: env.REQUEST_BODY_LIMIT }));
  app.use(requestId);
  app.use((request, response, next) => {
    const started = performance.now();
    request.observer = createObserver({ traceId: request.traceId, requestId: request.requestId });
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
        durationMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100),
      });
    });
    next();
  });

  app.use(router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
