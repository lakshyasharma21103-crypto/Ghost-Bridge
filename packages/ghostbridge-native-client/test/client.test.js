'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PROTOCOL_VERSION } = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('@ghostbridge/native-agent');
const {
  ScopeMismatchError,
  classifyRetry,
  createGhostBridgeClient,
} = require('../src');

test('client discovers, negotiates, installs, and invokes a native agent', async (context) => {
  const agent = createGhostBridgeAgent({
    passport: {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_client_test',
      passportVersion: '1',
      agentId: 'agent_client_test',
      displayName: 'Client Test Agent',
      safeDescription: 'A deterministic client test.',
      issuer: 'issuer_test',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['fixture.echo'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      dataDeclarations: [],
      delegationDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: 'revocations/passport_client_test',
    },
  });
  agent.capability('fixture.echo', {
    contract: {
      capabilityVersion: '1',
      displayName: 'Echo',
      safeDescription: 'Echoes bounded fixture data.',
      inputContractReference: 'data:echo@1',
      outputContractReference: 'data:echo@1',
      acceptedDataClasses: ['business'],
      producedDataClasses: ['business'],
      prohibitedDataClasses: ['secret'],
      riskCategory: 'low',
      sideEffectCategory: 'read',
      idempotencySupport: 'optional',
      asynchronousSupport: true,
      cancellationSupport: true,
      requiredPermissions: [],
      approvalRequirement: 'none',
      delegationPolicy: { allowed: false },
      timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
      receiptRequirement: 'required',
      status: 'active',
    },
    handler: async ({ input }) => ({ outcome: 'completed', output: input }),
  });
  const listener = await agent.listen();
  context.after(() => listener.close());
  const client = createGhostBridgeClient({ baseUrl: listener.baseUrl });
  assert.equal((await client.discover()).preferredVersion, PROTOCOL_VERSION);
  assert.equal((await client.getPassport()).agentId, 'agent_client_test');
  const grant = agent.issueInstallGrant({
    organizationScope: 'org_test',
    workspaceScope: 'workspace_test',
  });
  const scope = { organizationScope: 'org_test', workspaceScope: 'workspace_test' };
  assert.equal((await client.resolveInstallGrant(grant.key, scope)).redemptionState, 'available');
  const connection = await client.install(grant.key, scope);
  const catalog = await client.searchCapabilities({ query: 'echo', ...scope });
  assert.equal(catalog.items[0].capabilityKey, 'fixture.echo');
  assert.equal(
    (await client.getCapabilityDetails({
      agentId: connection.agentId,
      capabilityKey: 'fixture.echo',
      ...scope,
    })).capabilityVersion,
    '1',
  );
  await assert.rejects(
    () => client.searchCapabilities({ query: 'echo', organizationScope: 'org_other' }),
    (error) => error instanceof ScopeMismatchError || error.code === 'CONNECTION_NOT_ACTIVE',
  );
  const result = await client.invoke(connection.connectionId, {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: 'invocation_client_test',
    messageId: 'message_client_test',
    organizationScope: 'org_test',
    workspaceScope: 'workspace_test',
    initiatingSubject: 'client_test',
    targetAgentId: 'agent_client_test',
    targetPassportVersion: '1',
    capabilityKey: 'fixture.echo',
    capabilityVersion: '1',
    inputContractReference: 'data:echo@1',
    deadline: '2099-01-01T00:00:00.000Z',
    payload: { ok: true },
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
  });
  assert.deepEqual(result.output, { ok: true });
  assert.equal((await client.getReceipt(result.receipt.receiptId)).outcome, 'completed');
  assert.equal((await client.verifyReceipt(result.receipt)).valid, true);
  assert.equal(
    classifyRetry({ code: 'PROVIDER_UNAVAILABLE' }, { method: 'POST' }).retryable,
    false,
  );
  assert.equal(
    classifyRetry(
      { code: 'PROVIDER_UNAVAILABLE' },
      { method: 'POST', idempotencyKey: 'safe-retry' },
    ).retryable,
    true,
  );
  client.close();
});
