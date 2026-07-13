const { env } = require('./env');

const allowedOrigins = new Set([
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['X-Trace-Id', 'X-Request-Id'],
};

const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};

module.exports = {
  corsOptions,
  helmetOptions,
};
