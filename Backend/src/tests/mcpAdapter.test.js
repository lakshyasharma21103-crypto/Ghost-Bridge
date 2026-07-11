const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportConnection = require('../models/PassportConnection');
const Invocation = require('../models/Invocation');
const AuditLog = require('../models/AuditLog');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  mcpAdapter,
  MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
  MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED_MESSAGE,
} = require('../services/adapters/mcp.adapter');
const {
  invoke,
  importMcpTools,
} = require('../services/runtimeGateway.service');
const { safeConnectionView } = require('../services/connectionService');

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

function mcpConnection(overrides = {}) {
  return {
    _id: 'connection_123',
    passportId: 'passport_123',
    receivingUserId: 'user_123',
    status: 'connected',
    installScope: 'invoke',
    runtimeType: 'mcp',
    runtimeEndpoint: 'https://agent-company.com/mcp/agents/research-agent',
    resolvedPassportSnapshot: { auth: { type: 'no_auth_dev' } },
    ...overrides,
  };
}

function mcpPassport() {
  return {
    _id: 'passport_123',
    status: 'valid',
    auth: { type: 'no_auth_dev' },
    runtime: {
      type: 'mcp',
      endpoint: 'https://agent-company.com/mcp/agents/research-agent',
    },
  };
}

function capability() {
  return {
    _id: 'capability_123',
    passportId: 'passport_123',
    name: 'research_topic',
    runtimeToolName: 'research_topic',
    description: 'Researches a topic.',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
    },
    outputSchema: { type: 'object' },
    enabled: true,
  };
}

function invocationDocument(doc) {
  return {
    _id: 'invocation_123',
    ...doc,
    async save() {
      return this;
    },
  };
}

test('MCP adapter exposes the full interface and never fabricates remote runtime success', async () => {
  for (const method of ['initialize', 'listTools', 'callTool', 'invoke', 'cleanup']) {
    assert.equal(typeof mcpAdapter[method], 'function');
  }
  assert.equal(mcpAdapter.supported, true);
  assert.equal(mcpAdapter.availability, 'limited');
  assert.equal(mcpAdapter.remoteTransportImplemented, false);

  const result = await mcpAdapter.invoke(mcpConnection(), capability(), { topic: 'FIFA' });
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
      message: MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED_MESSAGE,
    },
  });
});

test('Runtime Gateway routes MCP invocations to the adapter and persists a structured failed invocation', async () => {
  const patches = [];
  const audits = [];
  let storedInvocation;
  patch(PassportConnection, 'findOne', async () => mcpConnection(), patches);
  patch(AgentPassport, 'findOne', async () => mcpPassport(), patches);
  patch(Capability, 'findOne', async () => capability(), patches);
  patch(Invocation, 'create', async (doc) => {
    storedInvocation = invocationDocument(doc);
    return storedInvocation;
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    await assert.rejects(() => invoke('connection_123', 'research_topic', { topic: 'FIFA' }), {
      code: ErrorCodes.MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
    });
    assert.equal(storedInvocation.status, 'failed');
    assert.equal(storedInvocation.error.code, ErrorCodes.MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED);
    assert.ok(audits.some((audit) => audit.action === 'invocation.failed'));
  } finally {
    restore(patches);
  }
});

test('MCP tool import returns the explicit remote transport limitation without importing capabilities', async () => {
  const patches = [];
  let capabilityWriteAttempted = false;
  patch(PassportConnection, 'findOne', async () => mcpConnection({ installScope: 'connect' }), patches);
  patch(AgentPassport, 'findOne', async () => mcpPassport(), patches);
  patch(Capability, 'findOneAndUpdate', async () => {
    capabilityWriteAttempted = true;
  }, patches);

  try {
    await assert.rejects(() => importMcpTools('connection_123'), {
      code: ErrorCodes.MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
    });
    assert.equal(capabilityWriteAttempted, false);
  } finally {
    restore(patches);
  }
});

test('connection views expose MCP as supported but limited', () => {
  const result = safeConnectionView(mcpConnection());
  assert.equal(result.runtime.type, 'mcp');
  assert.equal(result.runtime.supported, true);
  assert.equal(result.runtime.availability, 'limited');
  assert.equal(result.runtime.remoteTransportImplemented, false);
});
