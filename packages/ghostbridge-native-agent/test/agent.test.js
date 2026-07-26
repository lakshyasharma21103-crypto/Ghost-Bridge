'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PROTOCOL_VERSION } = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('../src');

function fixtureAgent() {
  const agent = createGhostBridgeAgent({
    mode: 'localFixtureMode',
    fixtureHttpPrincipal: {
      subjectId: 'fixture:test-host',
      authenticationMethod: 'explicit_local_fixture',
      permittedOrganizationScopes: ['*'],
      permittedWorkspaceScopes: ['*'],
    },
    approveAllFixtureCapabilities: true,
    passport: {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_fixture',
      passportVersion: '1',
      agentId: 'agent_fixture',
      displayName: 'Fixture Agent',
      safeDescription: 'A deterministic fixture.',
      issuer: 'issuer_fixture',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['fixture.read'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      dataDeclarations: [],
      delegationDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: 'revocations/passport_fixture',
    },
  });
  agent.capability('fixture.read', {
    contract: {
      capabilityVersion: '1',
      displayName: 'Read fixture',
      safeDescription: 'Returns the fixture.',
      inputContractReference: 'data:fixture-input@1',
      outputContractReference: 'data:fixture-output@1',
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
    handler: async ({ input }) => ({ outcome: 'completed', output: { value: input.value } }),
  });
  return agent;
}

test('one-time grant redemption is idempotent and scope bound', () => {
  const agent = fixtureAgent();
  const grant = agent.issueInstallGrant({
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  });
  const first = agent.redeemInstallGrant(grant.key, {
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  });
  const replay = agent.redeemInstallGrant(grant.key, {
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  });
  assert.equal(first.connectionId, replay.connectionId);
  assert.equal(agent.getConnectionCount(), 1);
  assert.throws(
    () =>
      agent.redeemInstallGrant(grant.key, {
        organizationScope: 'org_b',
        workspaceScope: 'workspace_a',
      }),
    (error) => error.errorCode === 'SCOPE_MISMATCH',
  );
});

test('progressive capability discovery filters scope before ranking and returns summaries', async () => {
  const agent = fixtureAgent();
  const scope = { organizationScope: 'org_catalog', workspaceScope: 'workspace_catalog' };
  const grant = agent.issueInstallGrant(scope);
  agent.redeemInstallGrant(grant.key, scope);
  const catalog = await agent.searchCapabilities({ query: 'fixture', ...scope, limit: 5 });
  assert.equal(catalog.items[0].capabilityKey, 'fixture.read');
  assert.equal(Object.hasOwn(catalog.items[0], 'inputContractReference'), false);
  assert.equal(
    (await agent.getCapabilityDetails({
      agentId: 'agent_fixture',
      capabilityKey: 'fixture.read',
      ...scope,
    })).inputContractReference,
    'data:fixture-input@1',
  );
  await assert.rejects(
    () => agent.searchCapabilities({ query: 'fixture', organizationScope: 'org_other' }),
    (error) => error.errorCode === 'CONNECTION_NOT_ACTIVE',
  );
});

test('native invocation produces a Task and Receipt, and revocation stops execution', async () => {
  const agent = fixtureAgent();
  const grant = agent.issueInstallGrant({
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  });
  const connection = agent.redeemInstallGrant(grant.key, {
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
  });
  const envelope = {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: 'invocation_fixture',
    messageId: 'message_fixture',
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
    initiatingSubject: 'user_fixture',
    targetAgentId: 'agent_fixture',
    targetPassportVersion: '1',
    capabilityKey: 'fixture.read',
    capabilityVersion: '1',
    inputContractReference: 'data:fixture-input@1',
    deadline: '2099-01-01T00:00:00.000Z',
    payload: { value: 42 },
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
  };
  const result = await agent.invoke(connection.connectionId, envelope);
  assert.equal(result.task.state, 'completed');
  assert.equal(result.receipt.outcome, 'completed');
  agent.revokeConnection(connection.connectionId);
  await assert.rejects(
    () => agent.invoke(connection.connectionId, { ...envelope, invocationId: 'invocation_2' }),
    (error) => error.errorCode === 'CONNECTION_NOT_ACTIVE',
  );
});

test('production mode fails closed without authorization, revocation, Receipt, and durable stores', () => {
  const passport = fixtureAgent().getPassport();
  assert.throws(
    () => createGhostBridgeAgent({ mode: 'productionMode', passport }),
    /authorization handler/,
  );
  assert.throws(
    () =>
      createGhostBridgeAgent({
        mode: 'productionMode',
        passport,
        authorization: () => ({ allowed: true }),
      }),
    /revocation resolver/,
  );
});

test('discovery ignores an arbitrary Host-derived base and omits Agent Coordination', async () => {
  const agent = fixtureAgent();
  const listener = await agent.listen();
  try {
    const discovery = agent.getDiscovery('https://attacker.example');
    assert.equal(discovery.features.delegation, false);
    assert.equal(Object.hasOwn(discovery.profiles, 'agentCoordination'), false);
    assert.equal(
      Object.values(discovery.endpoints).some((endpoint) =>
        endpoint.includes('attacker.example'),
      ),
      false,
    );
    assert.equal(discovery.endpoints.installGrantResolution.includes('{grant}'), false);
  } finally {
    await listener.close();
  }
});

test('task cancellation aborts the executing capability handler', async () => {
  let observedSignal;
  let runningTaskId;
  const taskStore = new Map();
  const originalSet = taskStore.set.bind(taskStore);
  taskStore.set = (key, value) => {
    if (value.state === 'running') runningTaskId = key;
    originalSet(key, value);
    return taskStore;
  };
  const base = fixtureAgent().getPassport();
  const agent = createGhostBridgeAgent({
    mode: 'localFixtureMode',
    approveAllFixtureCapabilities: true,
    taskStore,
    passport: base,
  });
  agent.capability('fixture.read', {
    contract: {
      capabilityVersion: '1',
      displayName: 'Cancelable fixture',
      safeDescription: 'Waits for cancellation.',
      inputContractReference: 'data:fixture-input@1',
      outputContractReference: 'data:fixture-output@1',
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
    handler: ({ context }) =>
      new Promise((resolve) => {
        observedSignal = context.signal;
        context.signal.addEventListener(
          'abort',
          () => resolve({ outcome: 'cancelled', output: { value: null } }),
          { once: true },
        );
      }),
  });
  const scope = { organizationScope: 'org_cancel', workspaceScope: 'workspace_cancel' };
  const grant = agent.issueInstallGrant(scope);
  const connection = agent.redeemInstallGrant(grant.key, scope);
  const pending = agent.invoke(connection.connectionId, {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: 'invocation_cancel',
    messageId: 'message_cancel',
    ...scope,
    initiatingSubject: 'user_fixture',
    targetAgentId: base.agentId,
    targetPassportVersion: base.passportVersion,
    capabilityKey: 'fixture.read',
    capabilityVersion: '1',
    inputContractReference: 'data:fixture-input@1',
    deadline: '2099-01-01T00:00:00.000Z',
    payload: { value: 1 },
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
  });
  while (!runningTaskId) await new Promise((resolve) => setImmediate(resolve));
  await agent.cancelTask(runningTaskId);
  await assert.rejects(pending, (error) => error.errorCode === 'TASK_CANCELLED');
  assert.equal(observedSignal.aborted, true);
  assert.equal(agent.getTask(runningTaskId).state, 'cancelled');
});
