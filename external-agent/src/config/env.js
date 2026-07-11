const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');
const { resolveGeminiThinkingConfiguration } = require('./geminiThinking');

const booleanValue = (defaultValue) =>
  z.preprocess((value) => {
    if (value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string' && /^(true|false)$/i.test(value.trim())) {
      return value.trim().toLowerCase() === 'true';
    }
    return value;
  }, z.boolean());

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5002),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    EXTERNAL_AGENT_RUNTIME_TOKEN: z.string().min(32, 'must contain at least 32 characters'),
    ALLOWED_GATEWAY_ORIGINS: z.string().default(''),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(60_000),
    AI_PROVIDER: z.enum(['gemini', 'mock']).default('gemini'),
    GEMINI_API_KEY: z.string().trim().optional(),
    GEMINI_MODEL: z.string().trim().optional(),
    GEMINI_WEB_SEARCH_ENABLED: booleanValue(true),
    GEMINI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(45_000),
    GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(128).max(8_192).default(1_500),
    GEMINI_MAX_SOURCES: z.coerce.number().int().min(1).max(20).default(8),
    GEMINI_THINKING_LEVEL: z.any().optional(),
    GEMINI_THINKING_BUDGET: z.any().optional(),
  })
  .superRefine((environment, context) => {
    if (environment.AI_PROVIDER === 'gemini') {
      if (!environment.GEMINI_API_KEY?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_API_KEY'],
          message: 'is required when AI_PROVIDER=gemini',
        });
      }
      if (!environment.GEMINI_MODEL?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_MODEL'],
          message: 'is required when AI_PROVIDER=gemini',
        });
      } else if (
        !/^(?:(?:models|tunedModels)\/)?[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/.test(
          environment.GEMINI_MODEL,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_MODEL'],
          message: 'must be a Gemini API model ID without project or location identifiers',
        });
      }

      const thinking = resolveGeminiThinkingConfiguration({
        model: environment.GEMINI_MODEL,
        thinkingLevel: environment.GEMINI_THINKING_LEVEL,
        thinkingBudget: environment.GEMINI_THINKING_BUDGET,
      });
      if (thinking.issue) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [thinking.issue.field],
          message: `${thinking.issue.reason} for model ${thinking.issue.model}`,
        });
      }
    }
    if (environment.NODE_ENV === 'production' && environment.AI_PROVIDER === 'mock') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER'],
        message: 'mock is not allowed in production',
      });
    }
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

  const thinking = resolveGeminiThinkingConfiguration({
    model: result.data.GEMINI_MODEL,
    thinkingLevel: result.data.GEMINI_THINKING_LEVEL,
    thinkingBudget: result.data.GEMINI_THINKING_BUDGET,
  });

  return Object.freeze({
    port: result.data.PORT,
    nodeEnv: result.data.NODE_ENV,
    runtimeToken: result.data.EXTERNAL_AGENT_RUNTIME_TOKEN,
    allowedGatewayOrigins: Object.freeze(parseOrigins(result.data.ALLOWED_GATEWAY_ORIGINS)),
    requestTimeoutMs: result.data.REQUEST_TIMEOUT_MS,
    aiProvider: result.data.AI_PROVIDER,
    gemini: Object.freeze({
      apiKey: result.data.GEMINI_API_KEY,
      model: result.data.GEMINI_MODEL,
      webSearchEnabled: result.data.GEMINI_WEB_SEARCH_ENABLED,
      requestTimeoutMs: result.data.GEMINI_REQUEST_TIMEOUT_MS,
      maxOutputTokens: result.data.GEMINI_MAX_OUTPUT_TOKENS,
      maxSources: result.data.GEMINI_MAX_SOURCES,
      thinkingLevel: thinking.thinkingLevel,
      thinkingBudget: thinking.thinkingBudget,
    }),
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
