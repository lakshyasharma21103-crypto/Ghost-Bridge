'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PROTOCOL_VERSION } = require('@ghostbridge/protocol-core');
const {
  mapInternalCapability,
  mapInternalConnection,
  mapInternalPassport,
  mapRuntimeRequestToInvocation,
} = require('../services/nativeProtocolMapping.service');
const {
  nativeProtocolMetricsSnapshot,
  recordNativeProtocolMetric,
  resetNativeProtocolMetricsForTest,
} = require('../services/nativeProtocolMetrics.service');
const { platformDiscovery } = require('../routes/nativeProtocolRoutes');

test('Platform discovery exposes bounded native protocol capabilities', () => {
  const discovery = platformDiscovery({
    protocol: 'https',
    get: () => 'platform.example.test',
  });
  assert.equal(discovery.preferredVersion, PROTOCOL_VERSION);
  assert.equal(discovery.status, 'experimental');
  assert.equal(discovery.features.delegation, false);
  assert.deepEqual(discovery.profiles.core.conformance, ['C1', 'C2', 'C3']);
  assert.deepEqual(discovery.profiles.governedExecution.conformance, ['G1', 'G2', 'G3']);
  assert.equal(discovery.profiles.agentCoordination.status, 'deferred');
  assert.equal(Object.values(discovery.endpoints).some((value) => /database|worker|credential/i.test(value)), false);
});

test('Platform mappings are explicit public DTO projections', () => {
  const passport = mapInternalPassport(
    {
      _id: 'database-object-id',
      partnerId: 'issuer_a',
      partnerAgentId: 'partner_agent',
      agent: {
        id: 'agent_a',
        name: 'Agent A',
        description: 'Safe description.',
        provider: 'vendor_a',
        version: '1',
      },
      runtime: { endpoint: 'https://private.internal', type: 'mcp' },
      auth: { header: 'authorization', scheme: 'Bearer', token: 'secret' },
      status: 'valid',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    [{ name: 'agent.read' }],
    { expiresAt: '2099-01-01T00:00:00.000Z' },
  );
  assert.equal(passport.protocolVersion, PROTOCOL_VERSION);
  assert.equal(passport.status, 'active');
  const serialized = JSON.stringify(passport);
  assert.doesNotMatch(serialized, /database-object-id|private\.internal|Bearer|secret/);
  assert.doesNotMatch(serialized, /runtime|auth|_id/);

  const capability = mapInternalCapability({
    name: 'agent.read',
    description: 'Read data.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    riskLevel: 'low',
    sideEffect: 'READ_ONLY',
    enabled: true,
  });
  assert.equal(capability.sideEffectCategory, 'read');

  const connection = mapInternalConnection({
    _id: 'private-connection-id',
    partnerId: 'org_a',
    receivingWorkspaceId: 'workspace_a',
    status: 'connected',
    runtimeEndpoint: 'https://private.internal',
    credentialId: 'credential-secret',
    resolvedPassportSnapshot: { agent: { id: 'agent_a', version: '1' } },
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(connection.status, 'active');
  assert.doesNotMatch(JSON.stringify(connection), /private-connection-id|private\.internal|credential-secret/);

  const invocation = mapRuntimeRequestToInvocation(
    {
      organizationId: 'org_a',
      receivingWorkspaceId: 'workspace_a',
      receivingUserId: 'user_a',
      capability: 'agent.read',
      input: { value: 1, apiKey: 'must-not-leak' },
      deadline: '2099-01-01T00:00:00.000Z',
    },
    { targetAgentId: 'agent_a', targetPassportVersion: '1' },
  );
  assert.equal(invocation.payload.apiKey, '[REDACTED]');
});

test('native protocol metric dimensions are bounded and identifier free', () => {
  resetNativeProtocolMetricsForTest();
  recordNativeProtocolMetric('discovery', 'success');
  recordNativeProtocolMetric('discovery', 'success');
  recordNativeProtocolMetric('agent_123', 'success');
  assert.deepEqual(nativeProtocolMetricsSnapshot(), [
    { category: 'discovery', outcome: 'success', value: 2 },
  ]);
});
