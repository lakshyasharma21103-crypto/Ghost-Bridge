const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const Invocation = require('../models/Invocation');
const AuditLog = require('../models/AuditLog');
const safeFetchUtility = require('../utils/safeFetch');
const { adapters } = require('../services/adapters');
const { encryptPayload } = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  invoke,
  getCapabilities,
  listInvocations,
  getInvocation,
} = require('../services/runtimeGateway.service');
const { runMockAgent } = require('../controllers/demoController');

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

function passport(auth = { type: 'no_auth_dev' }) {
  return {
    _id: 'passport_123',
    status: 'valid',
    auth,
    runtime: {
      type: 'rest',
      endpoint: 'https://example.com/api/agent/run',
      method: 'POST',
      inputField: 'instruction',
      outputField: 'response',
    },
  };
}

function capability(overrides = {}) {
  return {
    _id: 'capability_123',
    passportId: 'passport_123',
    name: 'research_topic',
    description: 'Researches a topic.',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string', minLength: 1 } },
      required: ['topic'],
      additionalProperties: false,
    },
    outputSchema: { type: 'object' },
    riskLevel: 'low',
    runtimeToolName: 'research_topic',
    enabled: true,
    ...overrides,
  };
}

function connection(overrides = {}) {
  return {
    _id: 'connection_123',
    passportId: 'passport_123',
    receivingWorkspaceId: 'workspace_123',
    receivingUserId: 'user_123',
    status: 'connected',
    installScope: 'invoke',
    runtimeType: 'rest',
    runtimeEndpoint: 'https://example.com/api/agent/run',
    resolvedPassportSnapshot: { auth: { type: 'no_auth_dev' } },
    ...overrides,
  };
}

function invocationDocument(doc) {
  return {
    _id: 'invocation_123',
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    updatedAt: new Date('2030-01-01T00:00:00.000Z'),
    ...doc,
    async save() {
      return this;
    },
  };
}

function patchInvocationContext(patches, context = {}) {
  patch(PassportConnection, 'findOne', async () => context.connection || connection(), patches);
  patch(AgentPassport, 'findOne', async () => context.passport || passport(), patches);
  patch(Capability, 'findOne', async () => context.capability || capability(), patches);
}

test('a connected REST agent validates, invokes, stores the result, and creates an audit log', async () => {
  const patches = [];
  const audits = [];
  let createdInvocation;
  let outbound;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      createdInvocation = invocationDocument(doc);
      return createdInvocation;
    },
    patches,
  );
  patch(
    AuditLog,
    'create',
    async (payload) => {
      audits.push(payload);
      return payload;
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async (url, options) => {
      outbound = { url, options };
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({
          response: { summary: 'Demo research result', sources: ['https://example.com/source-1'] },
        }),
      };
    },
    patches,
  );

  try {
    const result = await invoke(
      'connection_123',
      'research_topic',
      { topic: 'remaining FIFA matches in the US' },
      {
        actorId: 'user_123',
        requestId: 'req_test',
      },
    );

    assert.equal(result.status, 'completed');
    assert.equal(result.runtimeStatus, 200);
    assert.equal(result.output.summary, 'Demo research result');
    assert.equal(createdInvocation.status, 'completed');
    assert.equal(createdInvocation.inputSummary.topic, 'remaining FIFA matches in the US');
    assert.equal(outbound.url, 'https://example.com/api/agent/run');
    assert.deepEqual(JSON.parse(outbound.options.body), {
      instruction: 'remaining FIFA matches in the US',
    });
    assert.equal(outbound.options.headers['Content-Type'], 'application/json');
    assert.ok(audits.some((audit) => audit.action === 'invocation.completed'));
  } finally {
    restore(patches);
  }
});

test('invalid capability input fails before an Invocation is created or the runtime is called', async () => {
  const patches = [];
  let invocationCreated = false;
  let runtimeCalled = false;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async () => {
      invocationCreated = true;
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalled = true;
    },
    patches,
  );

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', {}), {
      code: ErrorCodes.CAPABILITY_INPUT_INVALID,
    });
    assert.equal(invocationCreated, false);
    assert.equal(runtimeCalled, false);
  } finally {
    restore(patches);
  }
});

test('a missing runtime adapter returns a structured error and persists the failed invocation', async () => {
  const patches = [];
  let storedInvocation;
  const previousAdapter = adapters.rest;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      storedInvocation = invocationDocument(doc);
      return storedInvocation;
    },
    patches,
  );
  patch(AuditLog, 'create', async () => ({}), patches);
  delete adapters.rest;

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', { topic: 'FIFA' }), {
      code: ErrorCodes.ADAPTER_NOT_IMPLEMENTED,
    });
    assert.equal(storedInvocation.status, 'failed');
    assert.equal(storedInvocation.error.code, ErrorCodes.ADAPTER_NOT_IMPLEMENTED);
  } finally {
    adapters.rest = previousAdapter;
    restore(patches);
  }
});

test('public invocation actors cannot access a connection outside their receiving workspace or user', async () => {
  const patches = [];
  patchInvocationContext(patches);

  try {
    await assert.rejects(
      () =>
        invoke(
          'connection_123',
          'research_topic',
          { topic: 'FIFA' },
          {
            enforceConnectionOwnership: true,
            receivingWorkspaceId: 'workspace_other',
            receivingUserId: 'user_other',
          },
        ),
      { code: ErrorCodes.CONNECTION_NOT_FOUND },
    );
  } finally {
    restore(patches);
  }
});

test('missing runtime credential is explicit and the failed invocation is persisted and audited', async () => {
  const patches = [];
  const audits = [];
  let createdInvocation;
  let runtimeCalled = false;
  patchInvocationContext(patches, {
    connection: connection({ resolvedPassportSnapshot: { auth: { type: 'api_key' } } }),
    passport: passport({ type: 'api_key', header: 'X-API-Key' }),
  });
  patch(
    Invocation,
    'create',
    async (doc) => {
      createdInvocation = invocationDocument(doc);
      return createdInvocation;
    },
    patches,
  );
  patch(
    AuditLog,
    'create',
    async (payload) => {
      audits.push(payload);
      return payload;
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalled = true;
    },
    patches,
  );

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', { topic: 'FIFA' }), {
      code: ErrorCodes.CREDENTIAL_REQUIRED,
    });
    assert.equal(createdInvocation.status, 'failed');
    assert.equal(createdInvocation.error.code, ErrorCodes.CREDENTIAL_REQUIRED);
    assert.equal(runtimeCalled, false);
    assert.ok(audits.some((audit) => audit.action === 'invocation.failed'));
  } finally {
    restore(patches);
  }
});

test('runtime failures are structured and stored without remote response bodies', async () => {
  const patches = [];
  let createdInvocation;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      createdInvocation = invocationDocument(doc);
      return createdInvocation;
    },
    patches,
  );
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => ({
      ok: false,
      status: 503,
      bodyText: 'private remote error body',
    }),
    patches,
  );

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', { topic: 'FIFA' }), {
      code: ErrorCodes.RUNTIME_INVOCATION_FAILED,
    });
    assert.equal(createdInvocation.status, 'failed');
    assert.equal(createdInvocation.error.code, ErrorCodes.RUNTIME_INVOCATION_FAILED);
    assert.equal(JSON.stringify(createdInvocation).includes('private remote error body'), false);
  } finally {
    restore(patches);
  }
});

test('runtime output must match the capability output schema before completion', async () => {
  const patches = [];
  let createdInvocation;
  patchInvocationContext(patches, {
    capability: capability({
      outputSchema: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
        additionalProperties: false,
      },
    }),
  });
  patch(
    Invocation,
    'create',
    async (doc) => {
      createdInvocation = invocationDocument(doc);
      return createdInvocation;
    },
    patches,
  );
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => ({
      ok: true,
      status: 200,
      bodyText: JSON.stringify({ response: { unexpected: true } }),
    }),
    patches,
  );

  try {
    await assert.rejects(
      () => invoke('connection_123', 'research_topic', { topic: 'external runtime' }),
      { code: ErrorCodes.RUNTIME_OUTPUT_INVALID },
    );
    assert.equal(createdInvocation.status, 'failed');
    assert.equal(createdInvocation.error.code, ErrorCodes.RUNTIME_OUTPUT_INVALID);
  } finally {
    restore(patches);
  }
});

test('REST invocation applies the passport auth header and never persists its credential plaintext', async () => {
  const patches = [];
  const audits = [];
  let createdInvocation;
  let outbound;
  const apiKey = 'runtime-api-key-value';
  patchInvocationContext(patches, {
    connection: connection({
      credentialId: 'credential_123',
      resolvedPassportSnapshot: { auth: { type: 'api_key', header: 'X-Runtime-Key' } },
    }),
    passport: passport({ type: 'api_key', header: 'X-Runtime-Key' }),
  });
  patch(
    Credential,
    'findOne',
    () => ({
      lean: async () => ({
        _id: 'credential_123',
        type: 'api_key',
        status: 'active',
        encryptedPayload: encryptPayload({ apiKey }),
      }),
    }),
    patches,
  );
  patch(
    Invocation,
    'create',
    async (doc) => {
      createdInvocation = invocationDocument(doc);
      return createdInvocation;
    },
    patches,
  );
  patch(
    AuditLog,
    'create',
    async (payload) => {
      audits.push(payload);
      return payload;
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async (_url, options) => {
      outbound = options;
      return { ok: true, status: 200, bodyText: JSON.stringify({ response: { summary: 'ok' } }) };
    },
    patches,
  );

  try {
    const result = await invoke('connection_123', 'research_topic', { topic: 'FIFA' });
    assert.equal(outbound.headers['X-Runtime-Key'], apiKey);
    assert.equal(JSON.stringify(result).includes(apiKey), false);
    assert.equal(JSON.stringify(createdInvocation).includes(apiKey), false);
    assert.equal(JSON.stringify(audits).includes(apiKey), false);
  } finally {
    restore(patches);
  }
});

test('capabilities are returned from the stored connection passport', async () => {
  const patches = [];
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(
    Capability,
    'find',
    () => ({
      sort: () => ({ lean: async () => [capability()] }),
    }),
    patches,
  );

  try {
    const result = await getCapabilities('connection_123');
    assert.equal(result.connectionId, 'connection_123');
    assert.equal(result.items[0].name, 'research_topic');
  } finally {
    restore(patches);
  }
});

test('invocation history is scoped to the receiving workspace and user', async () => {
  const patches = [];
  patch(
    PassportConnection,
    'find',
    () => ({
      select: () => ({ lean: async () => [{ _id: 'connection_123' }] }),
    }),
    patches,
  );
  patch(
    Invocation,
    'find',
    () => ({
      sort: () => ({
        lean: async () => [
          {
            _id: 'invocation_123',
            connectionId: 'connection_123',
            passportId: 'passport_123',
            capability: 'research_topic',
            status: 'completed',
            output: { summary: 'ok' },
            runtimeType: 'rest',
          },
        ],
      }),
    }),
    patches,
  );

  try {
    const result = await listInvocations({
      receivingWorkspaceId: 'workspace_123',
      receivingUserId: 'user_123',
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].invocationId, 'invocation_123');
  } finally {
    restore(patches);
  }
});

test('invocation detail is unavailable outside its receiving workspace and user', async () => {
  const patches = [];
  patch(
    Invocation,
    'findOne',
    () => ({
      lean: async () => ({
        _id: 'invocation_123',
        connectionId: 'connection_123',
        passportId: 'passport_123',
        capability: 'research_topic',
        status: 'completed',
        runtimeType: 'rest',
      }),
    }),
    patches,
  );
  patch(PassportConnection, 'findOne', async () => null, patches);

  try {
    await assert.rejects(
      () =>
        getInvocation('invocation_123', {
          receivingWorkspaceId: 'other_workspace',
          receivingUserId: 'other_user',
        }),
      { code: ErrorCodes.INVOCATION_NOT_FOUND },
    );
  } finally {
    restore(patches);
  }
});

test('the demo mock REST agent accepts topic or instruction and returns the expected response shape', () => {
  let payload;
  let forwardedError;
  runMockAgent(
    { body: { topic: 'remaining FIFA matches in the US' } },
    {
      json: (value) => {
        payload = value;
      },
    },
    (error) => {
      forwardedError = error;
    },
  );

  assert.equal(forwardedError, undefined);
  assert.equal(
    payload.response.summary,
    'Demo research result for remaining FIFA matches in the US',
  );
  assert.deepEqual(payload.response.sources, ['https://example.com/source-1']);
});
