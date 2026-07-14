const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const AuditLog = require('../models/AuditLog');
const safeFetchUtility = require('../utils/safeFetch');
const { adapters } = require('../services/adapters');
const { encryptPayload } = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const { AppError } = require('../utils/AppError');
const {
  invoke,
  getCapabilities,
  listInvocations,
  getInvocation,
  listInvocationAttempts,
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

let latestInvocationDocument;
let latestAttemptDocument;

function setPath(target, path, value) {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) current = current[part] ||= {};
  current[parts.at(-1)] = value;
}

function applyInvocationUpdate(document, update) {
  for (const [path, value] of Object.entries(update.$set || {})) setPath(document, path, value);
  for (const path of Object.keys(update.$unset || {})) {
    const parts = path.split('.');
    let current = document;
    for (const part of parts.slice(0, -1)) current = current?.[part];
    if (current) delete current[parts.at(-1)];
  }
  for (const [path, value] of Object.entries(update.$inc || {})) {
    setPath(document, path, Number(document[path] || 0) + value);
  }
  const history = update.$push?.stateHistory;
  if (history?.$each) {
    document.stateHistory ||= [];
    document.stateHistory.push(...history.$each);
    if (history.$slice < 0) document.stateHistory = document.stateHistory.slice(history.$slice);
  }
  return document;
}

function invocationDocument(doc) {
  latestInvocationDocument = {
    _id: 'invocation_123',
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    updatedAt: new Date('2030-01-01T00:00:00.000Z'),
    ...doc,
    async save() {
      return this;
    },
  };
  return latestInvocationDocument;
}

function patchInvocationContext(patches, context = {}) {
  latestInvocationDocument = undefined;
  latestAttemptDocument = undefined;
  patch(PassportConnection, 'findOne', async () => context.connection || connection(), patches);
  patch(AgentPassport, 'findOne', async () => context.passport || passport(), patches);
  patch(Capability, 'findOne', async () => context.capability || capability(), patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async (filter, update) => {
      if (!latestInvocationDocument) return null;
      if (
        filter.lifecycleState &&
        latestInvocationDocument.lifecycleState !== filter.lifecycleState
      ) {
        return null;
      }
      if (
        filter.executionLeaseId &&
        latestInvocationDocument.executionLeaseId !== filter.executionLeaseId
      ) {
        return null;
      }
      return applyInvocationUpdate(latestInvocationDocument, update);
    },
    patches,
  );
  patch(
    InvocationAttempt,
    'create',
    async (doc) => {
      latestAttemptDocument = {
        _id: `attempt_${doc.attemptNumber}`,
        ...doc,
        async save() {
          return this;
        },
      };
      return latestAttemptDocument;
    },
    patches,
  );
  patch(AuditLog, 'create', async (payload) => payload, patches);
}

test('a connected REST agent validates, invokes, stores the result, and creates an audit log', async () => {
  const patches = [];
  const audits = [];
  let createdInvocation;
  let outbound;
  let outboundCallCount = 0;
  let attachedInvocationId;
  const diagnostics = [];
  const diagnosticLogger = {
    info(fields) {
      diagnostics.push(fields);
    },
    warn(fields) {
      diagnostics.push(fields);
    },
    error(fields) {
      diagnostics.push(fields);
    },
  };
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
      outboundCallCount += 1;
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
        traceId: 'trace_test-observability',
        logger: diagnosticLogger,
        onInvocationCreated(value) {
          attachedInvocationId = value;
        },
      },
    );

    assert.equal(result.status, 'completed');
    assert.equal(result.runtimeStatus, 200);
    assert.equal(result.output.summary, 'Demo research result');
    assert.equal(createdInvocation.status, 'completed');
    assert.equal(createdInvocation.lifecycleState, 'succeeded');
    assert.equal(createdInvocation.attemptCount, 1);
    assert.equal(latestAttemptDocument.status, 'succeeded');
    assert.equal(latestAttemptDocument.attemptNumber, 1);
    assert.equal(JSON.stringify(latestAttemptDocument).includes('remaining FIFA matches'), false);
    assert.equal(createdInvocation.inputSummary.topic, 'remaining FIFA matches in the US');
    assert.equal(outbound.url, 'https://example.com/api/agent/run');
    assert.deepEqual(JSON.parse(outbound.options.body), {
      instruction: 'remaining FIFA matches in the US',
    });
    assert.equal(outbound.options.headers['Content-Type'], 'application/json');
    assert.equal(outbound.options.headers['x-trace-id'], 'trace_test-observability');
    assert.equal(outbound.options.headers['x-request-id'], 'req_test');
    assert.equal(outbound.options.headers['x-invocation-id'], 'invocation_123');
    assert.match(outbound.options.headers['Idempotency-Key'], /^hmac-sha256:[a-f0-9]{64}$/);
    assert.equal(attachedInvocationId, 'invocation_123');
    assert.equal(
      outbound.options.timeoutMs,
      require('../config/env').env.RUNTIME_INVOCATION_TIMEOUT_MS,
    );
    assert.equal(outboundCallCount, 1);
    assert.ok(audits.some((audit) => audit.action === 'invocation.completed'));
    const completedStages = diagnostics.filter(
      (entry) => entry.event === 'runtime.stage.completed',
    );
    for (const stage of [
      'request_validation',
      'connection_lookup',
      'capability_resolution',
      'policy_check',
      'credential_load',
      'credential_decryption',
      'request_mapping',
      'external_runtime_invocation',
      'response_validation',
      'response_mapping',
      'invocation_persistence',
      'audit_persistence',
    ]) {
      const entry = completedStages.find((item) => item.stage === stage);
      assert.ok(entry, `missing completed stage ${stage}`);
      assert.equal(typeof entry.durationMs, 'number');
    }
    assert.equal(JSON.stringify(diagnostics).includes('remaining FIFA matches'), false);
  } finally {
    restore(patches);
  }
});

test('invalid capability input persists a failed invocation before the runtime is called', async () => {
  const patches = [];
  let invocationCreated = false;
  let runtimeCalled = false;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      invocationCreated = true;
      return invocationDocument(doc);
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
    assert.equal(invocationCreated, true);
    assert.equal(runtimeCalled, false);
    assert.equal(latestInvocationDocument.lifecycleState, 'failed');
    assert.equal(latestInvocationDocument.error.code, ErrorCodes.CAPABILITY_INPUT_INVALID);
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

test('safe external authentication errors remain non-retryable despite an upstream 502', async () => {
  const patches = [];
  patchInvocationContext(patches);
  patch(Invocation, 'create', async (doc) => invocationDocument(doc), patches);
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => ({
      ok: false,
      status: 502,
      bodyText: JSON.stringify({
        error: {
          code: 'GEMINI_AUTHENTICATION_FAILED',
          message: 'Authorization: Bearer private-provider-token',
          retryable: false,
        },
      }),
    }),
    patches,
  );

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', { topic: 'FIFA' }), {
      code: 'GEMINI_AUTHENTICATION_FAILED',
    });
    assert.equal(latestInvocationDocument.lifecycleState, 'failed');
    assert.equal(latestInvocationDocument.error.retryable, false);
    assert.equal(latestInvocationDocument.retryDecisionReason, 'AUTHENTICATION_FAILURE');
    assert.equal(latestAttemptDocument.retryable, false);
    assert.equal(latestAttemptDocument.retryDecisionReason, 'AUTHENTICATION_FAILURE');
    assert.doesNotMatch(
      JSON.stringify({ invocation: latestInvocationDocument, attempt: latestAttemptDocument }),
      /private-provider-token|Authorization|Bearer/,
    );
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

test('same idempotency key and request replays one stored invocation without another execution', async () => {
  const patches = [];
  const rawKey = 'client-replay-key-123456789';
  let createCalls = 0;
  let runtimeCalls = 0;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      createCalls += 1;
      if (createCalls > 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
      return invocationDocument(doc);
    },
    patches,
  );
  patch(
    Invocation,
    'findOne',
    () => ({
      select() {
        return this;
      },
      async exec() {
        return latestInvocationDocument;
      },
    }),
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({ response: { summary: 'one execution' } }),
      };
    },
    patches,
  );

  try {
    const first = await invoke(
      'connection_123',
      'research_topic',
      { topic: 'FIFA' },
      {
        idempotencyKey: rawKey,
        requestId: 'req_first',
        traceId: 'trace_replay',
      },
    );
    const replay = await invoke(
      'connection_123',
      'research_topic',
      { topic: 'FIFA' },
      {
        idempotencyKey: rawKey,
        requestId: 'req_second',
        traceId: 'trace_replay',
      },
    );

    assert.equal(first.status, 'completed');
    assert.equal(replay.status, 'completed');
    assert.equal(replay.idempotencyReplayed, true);
    assert.equal(runtimeCalls, 1);
    assert.equal(createCalls, 2);
    assert.match(latestInvocationDocument.idempotencyKeyHash, /^hmac-sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(latestInvocationDocument).includes(rawKey), false);
  } finally {
    restore(patches);
  }
});

test('same idempotency key with a different normalized request returns a conflict', async () => {
  const patches = [];
  const rawKey = 'client-conflict-key-123456';
  let createCalls = 0;
  let runtimeCalls = 0;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      createCalls += 1;
      if (createCalls > 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
      return invocationDocument(doc);
    },
    patches,
  );
  patch(
    Invocation,
    'findOne',
    () => ({
      select() {
        return this;
      },
      async exec() {
        return latestInvocationDocument;
      },
    }),
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({ response: { summary: 'one execution' } }),
      };
    },
    patches,
  );

  try {
    await invoke(
      'connection_123',
      'research_topic',
      { topic: 'FIFA' },
      {
        idempotencyKey: rawKey,
      },
    );
    await assert.rejects(
      () =>
        invoke(
          'connection_123',
          'research_topic',
          { topic: 'different request' },
          {
            idempotencyKey: rawKey,
          },
        ),
      { code: ErrorCodes.IDEMPOTENCY_CONFLICT },
    );
    assert.equal(runtimeCalls, 1);
    assert.equal(JSON.stringify(latestInvocationDocument).includes(rawKey), false);
  } finally {
    restore(patches);
  }
});

test('simultaneous duplicate requests reserve one invocation and execute the runtime once', async () => {
  const patches = [];
  let created = false;
  let runtimeCalls = 0;
  patchInvocationContext(patches);
  patch(
    Invocation,
    'create',
    async (doc) => {
      if (created) throw Object.assign(new Error('duplicate'), { code: 11000 });
      created = true;
      return invocationDocument(doc);
    },
    patches,
  );
  patch(
    Invocation,
    'findOne',
    () => ({
      select() {
        return this;
      },
      async exec() {
        return latestInvocationDocument;
      },
    }),
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      await new Promise((resolve) => setImmediate(resolve));
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({ response: { summary: 'one execution' } }),
      };
    },
    patches,
  );

  try {
    const [first, duplicate] = await Promise.all([
      invoke(
        'connection_123',
        'research_topic',
        { topic: 'FIFA' },
        {
          idempotencyKey: 'concurrent-key-123456789',
        },
      ),
      invoke(
        'connection_123',
        'research_topic',
        { topic: 'FIFA' },
        {
          idempotencyKey: 'concurrent-key-123456789',
        },
      ),
    ]);
    assert.equal(runtimeCalls, 1);
    assert.ok(first.idempotencyReplayed === true || duplicate.idempotencyReplayed === true);
    assert.equal(first.invocationId, duplicate.invocationId);
  } finally {
    restore(patches);
  }
});

test('an ambiguous outbound timeout enters recovery_required and is never retried', async () => {
  const patches = [];
  let runtimeCalls = 0;
  patchInvocationContext(patches);
  patch(Invocation, 'create', async (doc) => invocationDocument(doc), patches);
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      throw new AppError(504, ErrorCodes.SAFE_FETCH_TIMEOUT, 'Outbound request timed out.');
    },
    patches,
  );

  try {
    await assert.rejects(
      () =>
        invoke(
          'connection_123',
          'research_topic',
          { topic: 'private prompt' },
          {
            idempotencyKey: 'timeout-key-123456789',
          },
        ),
      (error) => {
        assert.equal(error.code, ErrorCodes.SAFE_FETCH_TIMEOUT);
        assert.equal(error.lifecycleState, 'recovery_required');
        assert.equal(error.recoveryRequired, true);
        return true;
      },
    );
    assert.equal(runtimeCalls, 1);
    assert.equal(latestInvocationDocument.lifecycleState, 'recovery_required');
    assert.equal(latestInvocationDocument.recoveryReasonCode, 'REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS');
    assert.equal(latestInvocationDocument.retryState, 'recovery_required');
    assert.equal(latestAttemptDocument.status, 'recovery_required');
    assert.equal(latestAttemptDocument.outcomeAmbiguous, true);
    assert.equal(JSON.stringify(latestAttemptDocument).includes('private prompt'), false);
  } finally {
    restore(patches);
  }
});

test('exhausted formatting-only recovery metadata never triggers a second grounded request', async () => {
  const patches = [];
  let runtimeCalls = 0;
  patchInvocationContext(patches);
  patch(Invocation, 'create', async (doc) => invocationDocument(doc), patches);
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      return {
        ok: false,
        status: 503,
        bodyText: JSON.stringify({
          error: {
            code: 'GEMINI_UPSTREAM_UNAVAILABLE',
            operation: 'structured_formatting',
            stage: 'structured_formatting',
            retryable: true,
            recoveryRequired: true,
            recoveryReason: 'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
          },
        }),
      };
    },
    patches,
  );

  try {
    await assert.rejects(
      () => invoke('connection_123', 'research_topic', { topic: 'FIFA' }),
      (error) => error.recoveryRequired === true,
    );
    assert.equal(runtimeCalls, 1);
    assert.equal(latestInvocationDocument.lifecycleState, 'recovery_required');
    assert.equal(
      latestInvocationDocument.recoveryReasonCode,
      'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
    );
    assert.equal(latestAttemptDocument.safeStage, 'structured_formatting');
  } finally {
    restore(patches);
  }
});

test('audit persistence failure cannot overwrite a successfully persisted invocation', async () => {
  const patches = [];
  patchInvocationContext(patches);
  patch(Invocation, 'create', async (doc) => invocationDocument(doc), patches);
  patch(
    AuditLog,
    'create',
    async () => {
      throw new Error('audit store unavailable');
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => ({
      ok: true,
      status: 200,
      bodyText: JSON.stringify({ response: { summary: 'persisted success' } }),
    }),
    patches,
  );

  try {
    const result = await invoke('connection_123', 'research_topic', { topic: 'FIFA' });
    assert.equal(result.status, 'completed');
    assert.equal(result.lifecycleState, 'succeeded');
    assert.equal(latestInvocationDocument.lifecycleState, 'succeeded');
    assert.equal(latestInvocationDocument.error, undefined);
  } finally {
    restore(patches);
  }
});

test('success persistence uncertainty becomes recovery_required without a second runtime call', async () => {
  const patches = [];
  let runtimeCalls = 0;
  let rejectedSuccessWrite = false;
  patchInvocationContext(patches);
  const atomicUpdate = Invocation.findOneAndUpdate;
  patch(Invocation, 'create', async (doc) => invocationDocument(doc), patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async (filter, update, options) => {
      if (update.$set?.lifecycleState === 'succeeded' && !rejectedSuccessWrite) {
        rejectedSuccessWrite = true;
        throw Object.assign(new Error('database write uncertain'), {
          code: 'MONGO_WRITE_UNCERTAIN',
        });
      }
      return atomicUpdate(filter, update, options);
    },
    patches,
  );
  patch(
    safeFetchUtility,
    'safeFetch',
    async () => {
      runtimeCalls += 1;
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({ response: { summary: 'remote completed once' } }),
      };
    },
    patches,
  );

  try {
    await assert.rejects(
      () => invoke('connection_123', 'research_topic', { topic: 'FIFA' }),
      (error) => error.recoveryRequired === true,
    );
    assert.equal(runtimeCalls, 1);
    assert.equal(latestInvocationDocument.lifecycleState, 'recovery_required');
    assert.equal(latestInvocationDocument.recoveryReasonCode, 'RESPONSE_PERSISTENCE_UNCERTAIN');
    assert.equal(latestAttemptDocument.status, 'recovery_required');
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

test('invocation attempts are tenant-authorized, paginated, and safely projected', async () => {
  const patches = [];
  let attemptFilter;
  patch(
    Invocation,
    'findOne',
    () => ({
      lean: async () => ({
        _id: 'invocation_123',
        connectionId: 'connection_123',
        receivingWorkspaceId: 'workspace_123',
      }),
    }),
    patches,
  );
  patch(
    PassportConnection,
    'findOne',
    () => ({
      select() {
        return this;
      },
      lean: async () => ({ _id: 'connection_123' }),
    }),
    patches,
  );
  patch(
    InvocationAttempt,
    'find',
    (filter) => {
      attemptFilter = filter;
      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return this;
        },
        lean: async () => [
          {
            _id: 'attempt_1',
            invocationId: 'invocation_123',
            connectionId: 'connection_123',
            attemptNumber: 1,
            status: 'failed',
            runtimeType: 'rest',
            safeStage: 'external_runtime_invocation',
            errorCode: 'SAFE_FETCH_TIMEOUT',
            retryable: true,
            retryDecision: 'denied',
            retryDecisionReason: 'REMOTE_IDEMPOTENCY_NOT_CONFIRMED',
            outcomeAmbiguous: true,
            idempotencyKeyHash: 'hmac-sha256:secret-hash-must-not-leak',
            prompt: 'private prompt',
            output: 'private output',
            sourceUrl: 'https://private.example/source',
          },
        ],
      };
    },
    patches,
  );
  patch(InvocationAttempt, 'countDocuments', async () => 1, patches);

  try {
    const result = await listInvocationAttempts('invocation_123', {
      receivingWorkspaceId: 'workspace_123',
      receivingUserId: 'user_123',
      page: '1',
      limit: '10',
    });
    assert.equal(attemptFilter.receivingWorkspaceId, 'workspace_123');
    assert.equal(result.pagination.total, 1);
    assert.equal(result.items[0].retryReason, 'REMOTE_IDEMPOTENCY_NOT_CONFIRMED');
    assert.equal(result.items[0].outcomeAmbiguous, true);
    assert.doesNotMatch(
      JSON.stringify(result),
      /private prompt|private output|private\.example|idempotencyKeyHash|secret-hash/,
    );
  } finally {
    restore(patches);
  }
});

test('cross-tenant invocation-attempt access is denied before attempt documents are queried', async () => {
  const patches = [];
  let attemptsQueried = false;
  patch(
    Invocation,
    'findOne',
    () => ({
      lean: async () => ({
        _id: 'invocation_123',
        connectionId: 'connection_123',
        receivingWorkspaceId: 'workspace_b',
      }),
    }),
    patches,
  );
  patch(
    PassportConnection,
    'findOne',
    () => ({
      select() {
        return this;
      },
      lean: async () => null,
    }),
    patches,
  );
  patch(
    InvocationAttempt,
    'find',
    () => {
      attemptsQueried = true;
      throw new Error('must not query attempts');
    },
    patches,
  );

  try {
    await assert.rejects(
      () =>
        listInvocationAttempts('invocation_123', {
          receivingWorkspaceId: 'workspace_a',
          receivingUserId: 'user_a',
        }),
      { code: ErrorCodes.INVOCATION_NOT_FOUND },
    );
    assert.equal(attemptsQueried, false);
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
