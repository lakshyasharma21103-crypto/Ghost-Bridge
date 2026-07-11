const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5002),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  EXTERNAL_AGENT_RUNTIME_TOKEN: z.string().min(32, 'must contain at least 32 characters'),
  ALLOWED_GATEWAY_ORIGINS: z.string().default(''),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(15_000),
});

function parseOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        throw new Error('ALLOWED_GATEWAY_ORIGINS must contain comma-separated HTTP(S) origins.');
      }
      return origin;
    });
}

function readEnvironment(source = process.env) {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`)
      .join('; ');
    throw new Error(`External agent environment validation failed: ${summary}`);
  }

  return Object.freeze({
    port: result.data.PORT,
    nodeEnv: result.data.NODE_ENV,
    runtimeToken: result.data.EXTERNAL_AGENT_RUNTIME_TOKEN,
    allowedGatewayOrigins: Object.freeze(parseOrigins(result.data.ALLOWED_GATEWAY_ORIGINS)),
    requestTimeoutMs: result.data.REQUEST_TIMEOUT_MS,
    jsonBodyLimit: '32kb',
    rateLimitWindowMs: 60_000,
    rateLimitMax: 120,
  });
}

function loadEnvironment() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  return readEnvironment(process.env);
}

module.exports = {
  loadEnvironment,
  readEnvironment,
};
