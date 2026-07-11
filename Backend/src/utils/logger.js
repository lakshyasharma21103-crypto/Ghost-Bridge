const pino = require('pino');
const { redactSecrets } = require('./redact');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    censor: '[redacted]',
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-partner-api-key',
      'headers.authorization',
      'headers.cookie',
      'headers.x-partner-api-key',
      '*.password',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.secret',
      '*.apiKey',
      '*.api_key',
      '*.credential',
      '*.encryptedPayload',
      '*.encrypted_payload',
      '*.ciphertext',
      '*.MONGODB_URI',
      '*.JWT_SECRET',
      '*.CREDENTIAL_ENCRYPTION_KEY',
      '*.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN',
    ],
  },
});

function safeLogPayload(payload) {
  return redactSecrets(payload);
}

module.exports = {
  logger,
  safeLogPayload,
};
