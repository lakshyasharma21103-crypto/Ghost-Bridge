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
const { logger } = require('./utils/logger');

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
    const started = Date.now();
    response.on('finish', () => {
      logger.info(
        {
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Date.now() - started,
        },
        'HTTP request completed',
      );
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
