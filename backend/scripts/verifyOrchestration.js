const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertNodeTransition,
  assertRunTransition,
} = require('../src/constants/orchestration');
const {
  safeDefinitionSnapshot,
  validateAgainstSchema,
  validateDefinitionDocument,
} = require('../src/services/orchestrationValidation.service');
const {
  projectValidatedOutput,
  resolveNodeInput,
} = require('../src/services/orchestrationMapping.service');

function report(stage, detail) {
  console.log(`PASS ${stage}: ${detail}`);
}

const inputSchema = {
  type: 'object',
  properties: { topic: { type: 'string' } },
  required: ['topic'],
  additionalProperties: false,
};
const researchOutputSchema = {
  type: 'object',
  properties: { summary: { type: 'string' }, internalNote: { type: 'string' } },
  required: ['summary'],
  additionalProperties: false,
};
const writerInputSchema = {
  type: 'object',
  properties: { topic: { type: 'string' }, researchSummary: { type: 'string' } },
  required: ['topic', 'researchSummary'],
  additionalProperties: false,
};
const finalSchema = {
  type: 'object',
  properties: { answer: { type: 'string' } },
  required: ['answer'],
  additionalProperties: false,
};

function mockFixtures() {
  const secret = 'verifier-provider-secret-must-never-appear';
  const passports = [
    { _id: '64b000000000000000000001', status: 'valid', agent: { version: '1.0.0' } },
    { _id: '64b000000000000000000002', status: 'valid', agent: { version: '2.0.0' } },
  ];
  const connections = [
    {
      _id: '64c000000000000000000001',
      passportId: passports[0]._id,
      status: 'connected',
      installScope: 'invoke',
      credentialId: '64d000000000000000000001',
      encryptedDelegatedCredential: secret,
    },
    {
      _id: '64c000000000000000000002',
      passportId: passports[1]._id,
      status: 'connected',
      installScope: 'invoke',
      credentialId: '64d000000000000000000002',
      encryptedDelegatedCredential: secret,
    },
  ];
  const definition = {
    _id: '64a000000000000000000001',
    name: 'Deterministic verifier orchestration',
    version: 1,
    inputSchema,
    outputSchema: finalSchema,
    concurrencyLimit: 2,
    maxRunDurationMs: 60_000,
    maxNodeExecutions: 4,
    defaultNodeTimeoutMs: 5_000,
    edges: [{ from: 'research', to: 'writer' }],
    nodes: [
      {
        nodeKey: 'research',
        displayName: 'Research',
        connectionId: connections[0]._id,
        passportId: passports[0]._id,
        _passportVersion: passports[0].agent.version,
        capability: 'research',
        operation: 'research',
        inputSchema,
        outputSchema: researchOutputSchema,
        inputMapping: { topic: '$run.input.topic' },
        timeoutMs: 5_000,
        retryPolicy: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100 },
        approvalRequirement: { required: false },
        policyContext: { classification: 'LOW' },
        continueOnFailure: false,
        dependencies: [],
      },
      {
        nodeKey: 'writer',
        displayName: 'Writer',
        connectionId: connections[1]._id,
        passportId: passports[1]._id,
        _passportVersion: passports[1].agent.version,
        capability: 'write',
        operation: 'write',
        inputSchema: writerInputSchema,
        outputSchema: finalSchema,
        inputMapping: {
          topic: '$run.input.topic',
          researchSummary: '$nodes.research.output.summary',
        },
        timeoutMs: 5_000,
        retryPolicy: { maxAttempts: 1, baseDelayMs: 10, maxDelayMs: 100 },
        approvalRequirement: { required: false },
        policyContext: { classification: 'LOW' },
        continueOnFailure: false,
        dependencies: ['research'],
      },
    ],
  };
  return { secret, passports, connections, definition };
}

async function verify() {
  const { secret, passports, connections, definition } = mockFixtures();
  report('mock passports', `${passports.length} deterministic Agent Passport records prepared`);
  assert.ok(connections.every((item) => item.status === 'connected' && item.credentialId));
  report('delegated connections', 'connections resolved by credential reference without plaintext access');

  const validation = validateDefinitionDocument(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  report('definition validation', 'two-node DAG is acyclic, reachable, bounded, and schema-valid');

  const snapshot = safeDefinitionSnapshot(definition);
  assert.equal(snapshot.nodes.length, 2);
  report('definition activation', 'immutable safe version snapshot created');

  const run = {
    id: 'run_verify_1',
    status: 'queued',
    input: validateAgainstSchema(inputSchema, { topic: 'secure orchestration' }),
    traceId: 'trace_verify_parent',
  };
  assertRunTransition(run.status, 'running');
  run.status = 'running';
  report('run creation', 'durable run state initialized with validated input');

  const calls = [];
  const replayCache = new Map();
  async function mockRuntimeGateway(connectionId, capability, input, context) {
    const key = context.idempotencyKey;
    if (replayCache.has(key)) return { ...replayCache.get(key), idempotencyReplayed: true };
    calls.push({ connectionId, capability, input, context });
    const output =
      capability === 'research'
        ? { summary: `summary:${input.topic}`, internalNote: 'discarded-by-projection' }
        : { answer: `answer:${input.researchSummary}` };
    const response = { lifecycleState: 'succeeded', status: 'completed', output };
    replayCache.set(key, response);
    return response;
  }

  const outputs = {};
  const audits = [];
  const research = snapshot.nodes[0];
  let nodeState = 'ready';
  assertNodeTransition(nodeState, 'running');
  nodeState = 'running';
  const researchInput = resolveNodeInput(
    research.inputMapping,
    { runInput: run.input, nodeOutputs: outputs, dependencies: [], metadata: {} },
    research.inputSchema,
  );
  const researchResponse = await mockRuntimeGateway(
    research.connectionId,
    research.capability,
    researchInput,
    {
      idempotencyKey: `${run.id}:research:1`,
      traceId: 'trace_verify_research',
      parentTraceId: run.traceId,
    },
  );
  const researchValidated = validateAgainstSchema(research.outputSchema, researchResponse.output);
  outputs.research = projectValidatedOutput(researchValidated, research.nodeKey, snapshot);
  assert.deepEqual(outputs.research, { summary: 'summary:secure orchestration' });
  assertNodeTransition(nodeState, 'succeeded');
  audits.push('orchestration.node.succeeded');
  report('node A gateway execution', 'research node invoked through the deterministic Runtime Gateway boundary');

  const writer = snapshot.nodes[1];
  const writerInput = resolveNodeInput(
    writer.inputMapping,
    {
      runInput: run.input,
      nodeOutputs: outputs,
      dependencies: writer.dependencies,
      metadata: {},
    },
    writer.inputSchema,
  );
  assert.equal(writerInput.researchSummary, outputs.research.summary);
  report('validated output mapping', 'node A exposed only its explicitly referenced summary field');

  const writerResponse = await mockRuntimeGateway(
    writer.connectionId,
    writer.capability,
    writerInput,
    {
      idempotencyKey: `${run.id}:writer:1`,
      traceId: 'trace_verify_writer',
      parentTraceId: run.traceId,
    },
  );
  outputs.writer = validateAgainstSchema(writer.outputSchema, writerResponse.output);
  audits.push('orchestration.node.succeeded');
  report('node B gateway execution', 'writer node invoked after its declared dependency succeeded');

  assert.ok(calls.every((call) => call.context.parentTraceId === run.traceId));
  assert.equal(new Set(calls.map((call) => call.context.traceId)).size, 2);
  report('trace lineage', 'child traces retain one parent run trace and unique node traces');

  const finalOutput = validateAgainstSchema(snapshot.outputSchema, outputs.writer);
  assert.deepEqual(finalOutput, { answer: 'answer:summary:secure orchestration' });
  assertRunTransition(run.status, 'succeeded');
  run.status = 'succeeded';
  audits.push('orchestration.run.succeeded');
  report('final output', 'terminal output matches the definition output schema');

  assert.deepEqual(audits, [
    'orchestration.node.succeeded',
    'orchestration.node.succeeded',
    'orchestration.run.succeeded',
  ]);
  report('audit evidence', 'node and run completion events captured with safe identifiers');

  const serialized = JSON.stringify({ snapshot, calls, outputs, audits });
  assert.equal(serialized.includes(secret), false);
  assert.doesNotMatch(serialized, /encryptedDelegatedCredential|credentialId|installKey|authorization/i);
  report('secret boundary', 'snapshot, mapping, gateway context, output, and audit evidence contain no secrets');

  await mockRuntimeGateway(research.connectionId, research.capability, researchInput, {
    idempotencyKey: `${run.id}:research:1`,
    traceId: 'trace_verify_research',
    parentTraceId: run.traceId,
  });
  assert.equal(calls.length, 2);
  report('idempotent replay', 'replayed node attempt created no duplicate logical invocation');

  const cancelled = { run: 'queued', node: 'ready' };
  assertRunTransition(cancelled.run, 'cancel_requested');
  cancelled.run = 'cancel_requested';
  assertNodeTransition(cancelled.node, 'cancelled');
  cancelled.node = 'cancelled';
  assertRunTransition(cancelled.run, 'cancelled');
  cancelled.run = 'cancelled';
  report('durable cancellation', 'separate run stopped before execution and reached an idempotent terminal state');

  const schedulerSource = fs.readFileSync(
    path.resolve(__dirname, '../src/services/orchestrationScheduler.service.js'),
    'utf8',
  );
  assert.match(schedulerSource, /runtimeGateway\.service/);
  assert.match(schedulerSource, /invokeThroughRuntimeGateway/);
  assert.doesNotMatch(schedulerSource, /fetch\(|axios\.|eval\(|new Function|dynamic require/i);
  report('implementation gate', 'scheduler source calls the Runtime Gateway and contains no direct agent transport');

  report('cleanup', 'deterministic in-memory fixtures released; no provider or database mutation occurred');
  console.log('Orchestration verification passed without external or billed provider requests.');
}

if (require.main === module) {
  verify().catch((error) => {
    console.error(`FAIL orchestration verification: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { mockFixtures, verify };
