const assert = require('node:assert/strict');
const test = require('node:test');
const { validateAgentPassportV1 } = require('../services/passportValidator');

function validPassport(overrides = {}) {
  return {
    protocol: 'agent-passport.v1',
    agent: {
      id: 'research-agent',
      name: 'Research Agent',
      provider: 'FlowAI',
      description: 'Searches the web and returns cited summaries.',
      version: '1.0.0',
      iconUrl: 'https://example.com/icon.png',
      ...(overrides.agent || {}),
    },
    auth: {
      type: 'api_key',
      header: 'Authorization',
      scheme: 'Bearer',
      scopes: ['agent.invoke'],
      ...(overrides.auth || {}),
    },
    runtime: {
      type: 'rest',
      endpoint: 'https://example.com/api/agent/run',
      method: 'POST',
      inputField: 'instruction',
      outputField: 'response',
      supportsStreaming: false,
      supportsLongRunningTasks: false,
      ...(overrides.runtime || {}),
    },
    install: {
      supportedModes: ['delegated_runtime_access', 'auth_required'],
      requiresUserConsent: true,
      ...(overrides.install || {}),
    },
    capabilities:
      overrides.capabilities || [
        {
          name: 'research_topic',
          description: 'Researches a topic and returns a summary with sources.',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
            },
            required: ['topic'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              sources: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          riskLevel: 'low',
        },
      ],
    health: {
      endpoint: 'https://example.com/health',
      ...(overrides.health || {}),
    },
  };
}

test('accepts a valid Agent Passport v1 document', () => {
  const result = validateAgentPassportV1(validPassport());
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.passport.capabilities[0].runtimeToolName, 'research_topic');
});

test('rejects missing required passport fields with structured validation errors', () => {
  const passport = validPassport();
  delete passport.agent.provider;
  const result = validateAgentPassportV1(passport);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === '/agent/provider'));
  assert.ok(result.errors.some((error) => error.code === 'REQUIRED_FIELD_MISSING'));
});

test('rejects unsupported auth and runtime types with structured errors', () => {
  const result = validateAgentPassportV1(
    validPassport({
      auth: { type: 'signed_secret' },
      runtime: { type: 'socket' },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'UNSUPPORTED_AUTH_TYPE'));
  assert.ok(result.errors.some((error) => error.code === 'UNSUPPORTED_RUNTIME_TYPE'));
});

test('rejects duplicate capability names', () => {
  const capability = validPassport().capabilities[0];
  const result = validateAgentPassportV1(
    validPassport({
      capabilities: [capability, { ...capability, name: 'Research_Topic' }],
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'DUPLICATE_CAPABILITY_NAME'));
});

test('rejects unsafe URLs', () => {
  const result = validateAgentPassportV1(
    validPassport({
      runtime: { endpoint: 'http://127.0.0.1:8080/run' },
      health: { endpoint: 'https://localhost/health' },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === '/runtime/endpoint' && error.code === 'UNSAFE_URL'));
  assert.ok(result.errors.some((error) => error.path === '/health/endpoint' && error.code === 'UNSAFE_URL'));
});

test('rejects invalid JSON Schema objects', () => {
  const result = validateAgentPassportV1(
    validPassport({
      capabilities: [
        {
          ...validPassport().capabilities[0],
          inputSchema: { type: 'definitely-not-a-json-schema-type' },
        },
      ],
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'INVALID_JSON_SCHEMA'));
});

test('rejects secret-like fields and values in passport JSON', () => {
  const result = validateAgentPassportV1(
    validPassport({
      auth: {
        apiKey: 'sk-this-should-not-be-here',
      },
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'SECRET_NOT_ALLOWED'));
});
