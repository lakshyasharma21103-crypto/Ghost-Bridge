const pino = require('pino');
const { redactSecrets } = require('./redact');

function createLogger(options = {}) {
  return pino(
    {
      level: options.level || process.env.LOG_LEVEL || 'info',
      base: options.base === undefined ? { service: 'external-research-agent' } : options.base,
      redact: {
        censor: '[redacted]',
        paths: [
          'authorization',
          'runtimeToken',
          'token',
          'headers.authorization',
          'req.headers.authorization',
          '*.runtimeToken',
          '*.token',
          '*.secret',
          '*.password',
          '*.credential',
        ],
      },
    },
    options.destination,
  );
}

const logger = createLogger();

function safeLogPayload(payload) {
  return redactSecrets(payload);
}

module.exports = {
  createLogger,
  logger,
  safeLogPayload,
};
