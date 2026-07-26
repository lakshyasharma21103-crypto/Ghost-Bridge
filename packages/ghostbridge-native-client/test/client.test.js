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
    mode: 'localFixtureMode',
    fixtureHttpPrincipal: {
      subjectId: 'fixture:client-test-host',
      authenticationMethod: 'explicit_local_fixture',
      permittedOrganizationScopes: ['*'],
      permittedWorkspaceScopes: ['*'],
    },
    approveAllFixtureCapabilities: true,
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
  const client = createGhostBridgeClient({
    baseUrl: listener.baseUrl,
    localFixtureMode: true,
    allowedLocalOrigins: [listener.baseUrl],
    approveAllFixtureCapabilities: true,
  });
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
  assert.deepEqual(
    {
      valid: (await client.verifyReceipt(result.receipt)).valid,
      proofState: (await client.verifyReceipt(result.receipt)).proofState,
    },
    { valid: false, proofState: 'invalid' },
  );
  assert.equal(
    classifyRetry({ code: 'PROVIDER_UNAVAILABLE' }, { method: 'POST' }).retryable,
    false,
  );
  assert.equal(
    classifyRetry(
      { code: 'PROVIDER_UNAVAILABLE' },
      { method: 'POST', idempotencyKey: 'safe-retry' },
    ).retryable,
    false,
  );
  assert.equal(
    classifyRetry(
      { code: 'PROVIDER_UNAVAILABLE' },
      {
        method: 'POST',
        idempotencyKey: 'safe-retry',
        capabilityIdempotencySupport: 'required',
        peerAcknowledgedIdempotency: true,
        sameRequestFingerprint: true,
        ambiguousRemoteOutcome: false,
      },
    ).retryable,
    true,
  );
  client.close();
});

test('client rejects unsafe targets, cross-origin endpoints, scope overrides, and ambiguous agent lookup', async () => {
  assert.throws(
    () => createGhostBridgeClient({ baseUrl: 'http://127.0.0.1:8080' }),
    /requires HTTPS/,
  );
  const client = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    fetch: async () =>
      new Response(
        JSON.stringify({
          protocol: 'ghostbridge',
          supportedVersions: [PROTOCOL_VERSION],
          preferredVersion: PROTOCOL_VERSION,
          status: 'experimental',
          features: {},
          transports: ['https-json'],
          maximumMessageBytes: 1000,
          endpoints: { passport: 'https://other.example/passport' },
          extensionNamespaces: [],
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  });
  await client.discover();
  await assert.rejects(() => client.getPassport(), /endpoint origin/);

  const first = {
    connectionId: 'connection_1',
    agentId: 'agent_same',
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  };
  client.connections.set(first.connectionId, first);
  client.connections.set('connection_2', {
    ...first,
    connectionId: 'connection_2',
    organizationScope: 'org_b',
  });
  await assert.rejects(
    () => client.invoke({ agentId: 'agent_same', capability: 'fixture.read', input: {} }),
    /Connection ID is required/,
  );
  await assert.rejects(
    () =>
      client.invoke({
        connectionId: first.connectionId,
        capability: 'fixture.read',
        organizationScope: 'org_other',
        input: {},
      }),
    (error) => error instanceof ScopeMismatchError,
  );
});
