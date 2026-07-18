const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const {
  assertNodeTransition,
  assertRunTransition,
  NODE_TRANSITIONS,
  RUN_TRANSITIONS,
} = require('../constants/orchestration');
const {
  assertSafePayload,
  inspectSafeJson,
  safeDefinitionSnapshot,
  validateAgainstSchema,
  validateDefinitionDocument,
} = require('../services/orchestrationValidation.service');
const {
  projectValidatedOutput,
  resolveNodeInput,
} = require('../services/orchestrationMapping.service');
const {
  availableConcurrency,
  isOrchestrationRetryable,
  retryDelay,
} = require('../services/orchestrationScheduler.service');
const metrics = require('../services/orchestrationMetrics.service');

const objectId = (suffix) => `64a0000000000000000000${String(suffix).padStart(2, '0')}`;
const inputSchema = {
  type: 'object',
  properties: { topic: { type: 'string' } },
  required: ['topic'],
  additionalProperties: false,
};
const outputSchema = {
  type: 'object',
  properties: { summary: { type: 'string' }, privateNote: { type: 'string' } },
  required: ['summary'],
  additionalProperties: false,
};

function node(nodeKey, dependencies = [], overrides = {}) {
  return {
    nodeKey,
    displayName: nodeKey,
    connectionId: objectId(Number(nodeKey.charCodeAt(0)) % 20),
    passportId: objectId((Number(nodeKey.charCodeAt(0)) % 20) + 20),
    _passportVersion: '1.0.0',
    capability: 'research',
    operation: 'research',
    inputSchema,
    outputSchema,
    inputMapping: { topic: '$run.input.topic' },
    timeoutMs: 5_000,
    retryPolicy: { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000 },
    approvalRequirement: { required: false },
    policyContext: {},
    continueOnFailure: false,
    dependencies,
    ...overrides,
  };
}

function definition(nodes = [node('a')], edges = []) {
  return {
    _id: objectId(99),
    name: 'Test orchestration',
    version: 1,
    inputSchema,
    outputSchema,
    nodes,
    edges,
    concurrencyLimit: 2,
    maxRunDurationMs: 60_000,
    maxNodeExecutions: Math.max(nodes.length, 10),
    defaultNodeTimeoutMs: 5_000,
  };
}

function codes(result) {
  return result.errors.map((error) => error.code);
}

test('DAG validation accepts a single root node', () => {
  const result = validateDefinitionDocument(definition());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.roots, ['a']);
});

test('DAG validation detects duplicate node keys deterministically', () => {
  assert.ok(codes(validateDefinitionDocument(definition([node('a'), node('a')]))).includes('ORCHESTRATION_NODE_DUPLICATE'));
});

test('DAG validation rejects an unknown dependency', () => {
  assert.ok(codes(validateDefinitionDocument(definition([node('a', ['missing'])]))).includes('ORCHESTRATION_DEPENDENCY_INVALID'));
});

test('DAG validation detects a two-node cycle', () => {
  const result = validateDefinitionDocument(definition([node('a', ['b']), node('b', ['a'])]));
  assert.ok(codes(result).includes('ORCHESTRATION_CYCLE_DETECTED'));
});

test('cyclic nodes are reported as unreachable from a root', () => {
  const result = validateDefinitionDocument(definition([node('a'), node('b', ['c']), node('c', ['b'])]));
  assert.ok(codes(result).includes('ORCHESTRATION_NODE_UNREACHABLE'));
});

test('parallel roots and a join produce a stable topological order', () => {
  const result = validateDefinitionDocument(definition([node('a'), node('b'), node('c', ['a', 'b'])]));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.roots, ['a', 'b']);
  assert.equal(result.topologicalOrder.at(-1), 'c');
});

test('invalid JSON Schemas are rejected', () => {
  const result = validateDefinitionDocument(definition([node('a', [], { inputSchema: { type: 'not-a-type' } })]));
  assert.ok(codes(result).includes('SCHEMA_INVALID'));
});

test('connection and passport references must be stable object IDs', () => {
  const invalid = definition([node('a', [], { connectionId: 'connection-name', passportId: '../passport' })]);
  const result = validateDefinitionDocument(invalid);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes('ORCHESTRATION_CONNECTION_REFERENCE_INVALID'));
  assert.ok(codes(result).includes('ORCHESTRATION_PASSPORT_REFERENCE_INVALID'));
});

test('values are validated against node schemas', () => {
  assert.throws(
    () => validateAgainstSchema(inputSchema, { topic: 42 }),
    (error) => error.code === 'ORCHESTRATION_SCHEMA_VALIDATION_FAILED',
  );
});

test('run input maps into a node without expression evaluation', () => {
  const result = resolveNodeInput(
    { topic: '$run.input.topic', literalFlag: { literal: true } },
    { runInput: { topic: 'safe' }, nodeOutputs: {}, dependencies: [], metadata: {} },
    {
      type: 'object',
      properties: { topic: { type: 'string' }, literalFlag: { type: 'boolean' } },
      required: ['topic', 'literalFlag'],
      additionalProperties: false,
    },
  );
  assert.deepEqual(result, { topic: 'safe', literalFlag: true });
});

test('declared dependency output maps into a downstream node', () => {
  const result = resolveNodeInput(
    { topic: '$nodes.a.output.summary' },
    { runInput: {}, nodeOutputs: { a: { summary: 'mapped' } }, dependencies: ['a'], metadata: {} },
    inputSchema,
  );
  assert.equal(result.topic, 'mapped');
});

test('undeclared node output mapping is rejected', () => {
  assert.throws(
    () => resolveNodeInput(
      { topic: '$nodes.a.output.summary' },
      { runInput: {}, nodeOutputs: { a: { summary: 'mapped' } }, dependencies: [], metadata: {} },
      inputSchema,
    ),
    (error) => error.code === 'ORCHESTRATION_MAPPING_DEPENDENCY_DENIED',
  );
});

test('arbitrary expressions and executable templates are rejected', () => {
  for (const expression of ['$process.env.SECRET', '${globalThis.process}', '$nodes.a.output["summary"]']) {
    assert.throws(
      () => resolveNodeInput(
        { topic: expression },
        { runInput: {}, nodeOutputs: {}, dependencies: ['a'], metadata: {} },
        inputSchema,
      ),
      /rejected|forbidden/i,
    );
  }
});

test('prototype pollution fields are rejected from parsed JSON', () => {
  const payload = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}');
  assert.throws(() => assertSafePayload(payload), /rejected/i);
  assert.equal({}.polluted, undefined);
});

test('objects with a custom prototype are rejected', () => {
  const value = Object.create({ inherited: true });
  value.safe = true;
  assert.ok(inspectSafeJson(value).some((error) => error.code === 'UNSAFE_OBJECT_PROTOTYPE'));
});

test('credential, private memory, system prompt, and reasoning fields are rejected', () => {
  for (const key of ['apiKey', 'credential', 'privateMemory', 'systemPrompt', 'chainOfThought']) {
    assert.throws(() => assertSafePayload({ [key]: 'protected' }), /rejected/i);
  }
});

test('oversized payloads are rejected before mapping', () => {
  assert.throws(() => assertSafePayload({ value: 'x'.repeat(1_000_100) }), /rejected/i);
});

test('snapshot uses a strict safe whitelist', () => {
  const source = definition();
  source.encryptedDelegatedCredential = 'ciphertext-private';
  source.nodes[0].runtimeToken = 'token-private';
  const snapshot = safeDefinitionSnapshot(source);
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes('ciphertext-private'), false);
  assert.equal(serialized.includes('token-private'), false);
  assert.doesNotMatch(serialized, /encryptedDelegatedCredential|runtimeToken|installKey/);
});

test('intermediate output projection stores only downstream-referenced fields', () => {
  const dag = definition([
    node('a'),
    node('b', ['a'], {
      inputMapping: { topic: '$nodes.a.output.summary' },
    }),
  ]);
  const snapshot = safeDefinitionSnapshot(dag);
  assert.deepEqual(
    projectValidatedOutput({ summary: 'allowed', privateNote: 'discarded' }, 'a', snapshot),
    { summary: 'allowed' },
  );
});

test('terminal node output remains available for final schema validation', () => {
  const snapshot = safeDefinitionSnapshot(definition());
  assert.deepEqual(
    projectValidatedOutput({ summary: 'final', privateNote: 'schema-authorized' }, 'a', snapshot),
    { summary: 'final', privateNote: 'schema-authorized' },
  );
});

test('node transition table accepts the complete happy path', () => {
  assert.equal(assertNodeTransition('blocked', 'ready'), true);
  assert.equal(assertNodeTransition('ready', 'running'), true);
  assert.equal(assertNodeTransition('running', 'succeeded'), true);
});

test('node terminal states reject every further transition', () => {
  for (const state of ['succeeded', 'failed', 'cancelled', 'skipped']) {
    assert.deepEqual(NODE_TRANSITIONS[state], []);
    assert.throws(() => assertNodeTransition(state, 'ready'), { code: 'ORCHESTRATION_NODE_TRANSITION_INVALID' });
  }
});

test('approval pause and resume transitions are explicit', () => {
  assert.equal(assertNodeTransition('running', 'waiting_approval'), true);
  assert.equal(assertNodeTransition('waiting_approval', 'ready'), true);
  assert.equal(assertNodeTransition('waiting_approval', 'failed'), true);
});

test('operational pause and retry resume transitions are explicit', () => {
  assert.equal(assertNodeTransition('ready', 'blocked'), true);
  assert.equal(assertNodeTransition('retry_wait', 'blocked'), true);
  assert.equal(assertNodeTransition('blocked', 'retry_wait'), true);
  const source = fs.readFileSync(path.resolve(__dirname, '../services/orchestrationScheduler.service.js'), 'utf8');
  assert.match(source, /operationallyBlocked !== true/);
});

test('run cancellation transitions are durable and terminal', () => {
  assert.equal(assertRunTransition('queued', 'cancel_requested'), true);
  assert.equal(assertRunTransition('cancel_requested', 'cancelled'), true);
  assert.deepEqual(RUN_TRANSITIONS.cancelled, []);
});

test('invalid run transitions fail deterministically', () => {
  assert.throws(() => assertRunTransition('succeeded', 'running'), { code: 'ORCHESTRATION_RUN_TRANSITION_INVALID' });
});

test('available concurrency never becomes negative', () => {
  assert.equal(availableConcurrency(3, 1), 2);
  assert.equal(availableConcurrency(3, 3), 0);
  assert.equal(availableConcurrency(3, 9), 0);
});

test('bounded exponential retry delay includes deterministic jitter', () => {
  assert.equal(retryDelay({ baseDelayMs: 100, maxDelayMs: 1_000 }, 1, () => 0), 100);
  assert.equal(retryDelay({ baseDelayMs: 100, maxDelayMs: 1_000 }, 3, () => 0.5), 440);
  assert.equal(retryDelay({ baseDelayMs: 100, maxDelayMs: 500 }, 9, () => 1), 500);
});

test('retry classification reuses platform retryability and denies governed failures', () => {
  assert.equal(isOrchestrationRetryable({ code: 'SAFE_FETCH_TIMEOUT' }), true);
  assert.equal(isOrchestrationRetryable({ code: 'AUTHORIZATION_DENIED', retryable: true }), false);
  assert.equal(isOrchestrationRetryable({ code: 'RUNTIME_OUTPUT_INVALID', statusCode: 503 }), false);
  assert.equal(isOrchestrationRetryable({ code: 'APPROVAL_REJECTED', retryable: true }), false);
});

test('metrics discard run, node, tenant, and user identifiers', () => {
  metrics.reset();
  metrics.increment('orchestration_node_failures', {
    category: 'timeout',
    runId: 'run_private',
    nodeId: 'node_private',
    userId: 'user_private',
  });
  const serialized = JSON.stringify(metrics.snapshot());
  assert.equal(serialized.includes('run_private'), false);
  assert.equal(serialized.includes('node_private'), false);
  assert.equal(serialized.includes('user_private'), false);
});

test('models expose tenant, idempotency, readiness, lease, retry, approval, and trace indexes', () => {
  const indexes = [
    ...OrchestrationDefinition.schema.indexes(),
    ...OrchestrationRun.schema.indexes(),
    ...OrchestrationNodeRun.schema.indexes(),
  ].map(([fields]) => Object.keys(fields).join(','));
  for (const expected of [
    'organizationId,workspaceId,status,updatedAt',
    'organizationId,workspaceId,idempotencyKeyHash',
    'status,leaseExpiresAt',
    'approvalRequestId,status',
    'traceId,createdAt',
  ]) assert.ok(indexes.includes(expected), expected);
});

test('run and node private payload fields are select-false', () => {
  for (const pathName of ['input', 'finalOutput', 'definitionSnapshot', 'idempotencyKeyHash']) {
    assert.equal(OrchestrationRun.schema.path(pathName).options.select, false);
  }
  for (const pathName of ['resolvedInput', 'validatedOutput', 'leaseToken']) {
    assert.equal(OrchestrationNodeRun.schema.path(pathName).options.select, false);
  }
});

test('scheduler invokes only the Runtime Gateway and does not implement direct transport', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../services/orchestrationScheduler.service.js'), 'utf8');
  assert.match(source, /runtimeGateway\.service/);
  assert.match(source, /invokeThroughRuntimeGateway/);
  assert.doesNotMatch(source, /fetch\(|axios\.|eval\(|new Function|runtimeEndpoint/);
});

test('API routes are partner authenticated and expose the complete Phase 13D1 surface', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../routes/orchestrationRoutes.js'), 'utf8');
  assert.match(source, /orchestrationRouter\.use\(authenticatePartner\)/);
  for (const route of [
    "'/definitions'",
    "'/definitions/:definitionId/validate'",
    "'/definitions/:definitionId/activate'",
    "'/definitions/:definitionId/archive'",
    "'/definitions/:definitionId/runs'",
    "'/runs'",
    "'/runs/:runId/nodes'",
    "'/runs/:runId/cancel'",
  ]) assert.ok(source.includes(route), route);
});

test('orchestration API serializers exclude raw node inputs and outputs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../services/orchestration.service.js'), 'utf8');
  const serializer = source.slice(source.indexOf('function serializeNodeRun'), source.indexOf('async function createDefinition'));
  assert.doesNotMatch(serializer, /resolvedInput|validatedOutput|definitionSnapshot|idempotencyKeyHash/);
});
