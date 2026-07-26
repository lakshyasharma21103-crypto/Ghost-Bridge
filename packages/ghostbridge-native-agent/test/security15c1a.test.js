'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PROTOCOL_VERSION,
  digest,
} = require('@ghostbridge/protocol-core');
const {
  TRUST_PROFILE_VERSION,
  digest: trustDigest,
  signDocument,
} = require('@ghostbridge/trust');
const {
  createSyntheticIssuer,
} = require('@ghostbridge/issuer');
const {
  createGhostBridgeAgent,
} = require('../src');

const CAPABILITY_KEY = 'fixture.secure_read';

class DurableStore {
  constructor() {
    this.durable = true;
    this.records = new Map();
  }

  get(key) {
    return this.records.get(key);
  }

  set(key, value) {
    this.records.set(key, structuredClone(value));
    return this;
  }

  has(key) {
    return this.records.has(key);
  }

  values() {
    return this.records.values();
  }

  get size() {
    return this.records.size;
  }
}

class AtomicDecisionStore extends DurableStore {
  async putDecision(decision) {
    if (this.records.has(decision.decisionId)) {
      throw new Error('Approval Decision already exists.');
    }
    this.records.set(decision.decisionId, structuredClone(decision));
  }

  async consumeApprovedDecision(criteria) {
    const current = this.records.get(criteria.decisionId);
    if (
      !current ||
      current.used ||
      current.decision !== 'approved' ||
      current.invocationId !== criteria.invocationId ||
      current.actionKey !== criteria.actionKey ||
      current.organizationScope !== criteria.organizationScope ||
      (current.workspaceScope || undefined) !== (criteria.workspaceScope || undefined) ||
      !Number.isFinite(Date.parse(current.expiresAt)) ||
      Date.parse(current.expiresAt) <= Date.parse(criteria.now)
    ) {
      return undefined;
    }
    this.records.set(criteria.decisionId, {
      ...current,
      used: true,
      consumedAt: criteria.now,
    });
    return structuredClone(current);
  }
}

function fixturePassport(now = Date.now()) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    passportId: 'passport_security_15c1a',
    passportVersion: '1',
    agentId: 'agent_security_15c1a',
    displayName: 'Phase 15C.1A Security Agent',
    safeDescription: 'A bounded Native Agent security fixture.',
    issuer: 'https://issuer.example',
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 86_400_000).toISOString(),
    status: 'active',
    capabilities: [CAPABILITY_KEY],
    supportedProtocolVersions: [PROTOCOL_VERSION],
    supportedTransports: ['https-json'],
    dataDeclarations: [],
    delegationDeclarations: [],
    approvalDeclarations: [],
    receiptSupport: true,
    revocationReference: 'https://issuer.example/revocations/passport',
  };
}

function fixtureContract(overrides = {}) {
  return {
    capabilityVersion: '1',
    displayName: 'Secure read',
    safeDescription: 'Reads a bounded security fixture.',
    inputContractReference: 'data:security-input@1',
    outputContractReference: 'data:security-output@1',
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
    ...overrides,
  };
}

function invocation(connection, overrides = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: `invocation_${Math.random().toString(16).slice(2)}`,
    messageId: `message_${Math.random().toString(16).slice(2)}`,
    organizationScope: connection.organizationScope,
    ...(connection.workspaceScope ? { workspaceScope: connection.workspaceScope } : {}),
    initiatingSubject: 'host:user',
    targetAgentId: connection.agentId,
    targetPassportVersion: connection.passportVersion,
    capabilityKey: CAPABILITY_KEY,
    capabilityVersion: '1',
    inputContractReference: 'data:security-input@1',
    deadline: new Date(Date.now() + 30_000).toISOString(),
    payload: { value: 1 },
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
    ...overrides,
  };
}

function fixtureSecurityAgent(options = {}) {
  let handlerCalls = 0;
  const agent = createGhostBridgeAgent({
    mode: options.mode || 'localFixtureMode',
    passport: fixturePassport(),
    approveAllFixtureCapabilities: true,
    authorization: options.authorization || (() => true),
    authenticateHttpRequest: options.authenticateHttpRequest,
    authorizationTimeoutMs: options.authorizationTimeoutMs,
  });
  agent.capability(CAPABILITY_KEY, {
    contract: fixtureContract(options.contract),
    handler: options.handler || (async ({ input }) => {
      handlerCalls += 1;
      return { outcome: 'completed', output: input };
    }),
  });
  return {
    agent,
    handlerCalls: () => handlerCalls,
  };
}

async function postJson(url, body, authorization) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('raw HTTP protected operations authenticate before authority mutations', async (context) => {
  let authenticationMode = 'normal';
  const fixture = fixtureSecurityAgent({
    authenticateHttpRequest: async ({ headers }) => {
      if (authenticationMode === 'throw') throw new Error('private authentication failure');
      if (authenticationMode === 'malformed') return {};
      if (headers.authorization !== 'Bearer fixture-host') return undefined;
      return {
        subjectId: 'host_security',
        authenticationMethod: 'test_bearer',
        organizationScope: 'org_security',
        permittedWorkspaceScopes: ['workspace_security'],
      };
    },
  });
  const scope = {
    organizationScope: 'org_security',
    workspaceScope: 'workspace_security',
  };
  const grant = fixture.agent.issueInstallGrant(scope);
  const connection = fixture.agent.redeemInstallGrant(grant.key, scope);
  const listener = await fixture.agent.listen();
  context.after(() => listener.close());

  const freshGrant = fixture.agent.issueInstallGrant(scope);
  const countBefore = fixture.agent.getConnectionCount();
  const unauthenticated = [
    ['/ghostbridge/install-grants/redeem', { grant: freshGrant.key, ...scope }],
    ['/ghostbridge/invocations', {
      connectionId: connection.connectionId,
      envelope: invocation(connection),
    }],
    ['/ghostbridge/tasks/unknown?action=cancel', {}],
    ['/ghostbridge/approvals/unknown/decisions', { challengeId: 'unknown' }],
    [`/ghostbridge/revocations/connection/${connection.connectionId}`, {
      reasonCode: 'OWNER_REVOKED',
    }],
  ];
  for (const [path, body] of unauthenticated) {
    const result = await postJson(`${listener.baseUrl}${path}`, body);
    assert.equal(result.status, 401, path);
    assert.equal(result.body.errorCode, 'AUTHENTICATION_REQUIRED', path);
  }
  assert.equal(fixture.agent.getConnectionCount(), countBefore);
  assert.equal(fixture.handlerCalls(), 0);
  assert.equal(
    fixture.agent.checkRevocation('connection', connection.connectionId).status,
    'active',
  );

  const spoofed = await postJson(
    `${listener.baseUrl}/ghostbridge/invocations`,
    {
      connectionId: connection.connectionId,
      envelope: invocation(connection),
      authenticatedPrincipal: {
        subjectId: 'attacker',
        organizationScope: scope.organizationScope,
      },
    },
    'Bearer fixture-host',
  );
  assert.equal(spoofed.status, 401);
  assert.equal(spoofed.body.errorCode, 'AUTHENTICATION_REQUIRED');

  const otherScope = {
    organizationScope: 'org_other',
    workspaceScope: 'workspace_security',
  };
  const otherGrant = fixture.agent.issueInstallGrant(otherScope);
  const outside = await postJson(
    `${listener.baseUrl}/ghostbridge/install-grants/redeem`,
    { grant: otherGrant.key, ...otherScope },
    'Bearer fixture-host',
  );
  assert.equal(outside.body.errorCode, 'SCOPE_MISMATCH');
  assert.equal(fixture.agent.getConnectionCount(), countBefore);

  for (const mode of ['malformed', 'throw']) {
    authenticationMode = mode;
    const rejected = await postJson(
      `${listener.baseUrl}/ghostbridge/invocations`,
      { connectionId: connection.connectionId, envelope: invocation(connection) },
      'Bearer fixture-host',
    );
    assert.equal(rejected.status, 401, mode);
    assert.equal(rejected.body.errorCode, 'AUTHENTICATION_REQUIRED', mode);
  }
  assert.equal(fixture.handlerCalls(), 0);
});

test('authorization denies every non-authorizing and unavailable result shape', async () => {
  const cases = [
    ['false', false],
    ['undefined', undefined],
    ['null', null],
    ['empty', {}],
    ['unknown', { decision: 'allow' }],
    ['indeterminate', { allowed: 'indeterminate' }],
    ['throw', () => {
      throw new Error('private policy detail');
    }],
    ['timeout', () => new Promise(() => {})],
  ];
  for (const [label, configured] of cases) {
    const fixture = fixtureSecurityAgent({
      authorization: typeof configured === 'function' ? configured : () => configured,
      authorizationTimeoutMs: 10,
    });
    const scope = { organizationScope: `org_${label}` };
    const grant = fixture.agent.issueInstallGrant(scope);
    const connection = fixture.agent.redeemInstallGrant(grant.key, scope);
    await assert.rejects(
      () => fixture.agent.invoke(connection.connectionId, invocation(connection)),
      (error) => {
        assert.equal(error.errorCode, 'AUTHORIZATION_DENIED', label);
        assert.doesNotMatch(error.safeMessage, /private policy detail/i);
        return true;
      },
    );
    assert.equal(fixture.handlerCalls(), 0, label);
  }

  for (const allowed of [true, { allowed: true }]) {
    const fixture = fixtureSecurityAgent({ authorization: () => allowed });
    const scope = { organizationScope: `org_allow_${typeof allowed}` };
    const grant = fixture.agent.issueInstallGrant(scope);
    const connection = fixture.agent.redeemInstallGrant(grant.key, scope);
    assert.equal(
      (await fixture.agent.invoke(connection.connectionId, invocation(connection))).task.state,
      'completed',
    );
  }
});

function createStores() {
  return {
    installGrants: new DurableStore(),
    connections: new DurableStore(),
    tasks: new DurableStore(),
    taskContexts: new DurableStore(),
    receipts: new DurableStore(),
    approvals: new DurableStore(),
    approvalDecisions: new AtomicDecisionStore(),
    idempotency: new DurableStore(),
    replay: new DurableStore(),
    revocation: new DurableStore(),
  };
}

function stripTestOnly(jwks) {
  return {
    ...jwks,
    keys: jwks.keys.map(({ testOnly: _testOnly, ...key }) => key),
  };
}

function unsignedReceipt(context, overrides = {}) {
  const {
    passport,
    contract,
    connection,
    envelope,
    task,
    result,
    evidence,
    clock,
  } = context;
  const completedAt = task.completedAt || new Date(clock()).toISOString();
  return {
    receiptId: `receipt_${Math.random().toString(16).slice(2)}`,
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    connectionId: connection.connectionId,
    agentId: passport.agentId,
    passportId: passport.passportId,
    passportVersion: passport.passportVersion,
    capabilityKey: contract.capabilityKey,
    capabilityVersion: contract.capabilityVersion,
    organizationScope: connection.organizationScope,
    ...(connection.workspaceScope ? { workspaceScope: connection.workspaceScope } : {}),
    outcome: result.outcome,
    outputContractReference: contract.outputContractReference,
    startedAt: task.startedAt || task.createdAt,
    completedAt,
    attemptCount: 1,
    ...(envelope.approvalReference
      ? { approvalReference: envelope.approvalReference }
      : {}),
    ...(envelope.idempotencyKey
      ? {
          requestFingerprint: digest({
            connectionId: connection.connectionId,
            capabilityKey: envelope.capabilityKey,
            capabilityVersion: envelope.capabilityVersion,
            idempotencyKey: envelope.idempotencyKey,
            payload: envelope.payload,
          }),
        }
      : {}),
    ...(result.safeFailureCode ? { safeFailureCode: result.safeFailureCode } : {}),
    outputDigest: trustDigest(result.output ?? null),
    evidenceDigest: trustDigest(evidence),
    billableStatusCategory: 'non_billable',
    nonBillableReason: 'phase_15c1a_test',
    revocationStateAtExecution: 'active',
    issuer: passport.issuer,
    audience: connection.hostAudience || 'host-security-audience',
    agentExecutionKeyId: 'test_execution_1',
    issuedAt: completedAt,
    expiresAt: new Date(Date.parse(completedAt) + 60_000).toISOString(),
    messageId: `receipt_message_${task.taskId}`,
    trustProfileVersion: TRUST_PROFILE_VERSION,
    ...overrides,
  };
}

async function createProductionFixture(options = {}) {
  const issuer = options.issuer || await createSyntheticIssuer({
    issuerId: 'https://issuer.example',
  });
  const executionKeyId = options.executionKeyId || issuer.keyIds.execution;
  const passport = {
    ...fixturePassport(),
    issuer: issuer.toolkit.issuerId,
    authorizedAgentExecutionKeys: [
      issuer.toolkit.authorizeAgentExecutionKey(issuer.keyIds.execution),
    ],
  };
  const stores = options.stores || createStores();
  const publishedJwks = stripTestOnly(issuer.toolkit.publishJwks());
  const verificationJwks = options.verificationJwks || publishedJwks;
  const signer = issuer.keyProvider.signer(executionKeyId);
  const baseReceiptIssuer = options.receiptIssuer || ((context) => unsignedReceipt(context));
  const agentOptions = {
    mode: 'productionMode',
    publicBaseUrl: 'https://agent.example',
    hostAudience: 'host-security-audience',
    receiptAudience: 'host-security-audience',
    passport,
    stores,
    authorization: options.authorization || (() => ({
      allowed: true,
      principalId: 'host_security',
      policyDecisionId: 'policy_decision_security',
      evaluatedAt: new Date().toISOString(),
      policyVersion: '1',
    })),
    authorizationTimeoutMs: 20,
    revocationResolver: options.revocationResolver || ((input) => ({
      status: 'active',
      freshness: 'fresh',
      subjectType: input.subjectType,
      subjectReference: input.subjectReference,
      organizationScope: input.organizationScope,
      workspaceScope: input.workspaceScope,
      issuer: passport.issuer,
      sequence: 1,
    })),
    receiptIssuer: baseReceiptIssuer,
    receiptVerificationJwks: verificationJwks,
    ...(options.receiptVerificationObserver
      ? { receiptVerificationObserver: options.receiptVerificationObserver }
      : {}),
    authenticateHttpRequest: async () => ({
      subjectId: 'host_security',
      authenticationMethod: 'test_bearer',
      organizationScope: 'org_security',
      permittedWorkspaceScopes: ['workspace_security'],
    }),
    ...(options.customSignedReceipt
      ? { receiptIssuerGuaranteesSigned: true }
      : {
          agentSigner: signer,
          agentExecutionKeyId: executionKeyId,
        }),
  };
  if (options.customSignedReceipt) {
    agentOptions.receiptIssuer = async (context) => {
      const receipt = unsignedReceipt(context);
      const changed = options.customSignedReceipt(receipt, context) || receipt;
      return signDocument(changed, signer, {
        purpose: 'execution_receipt_signing',
      });
    };
  }
  if (options.unsignedReceipt === true) {
    delete agentOptions.agentSigner;
    delete agentOptions.agentExecutionKeyId;
    agentOptions.receiptIssuerGuaranteesSigned = true;
  }
  const agent = createGhostBridgeAgent(agentOptions);
  let handlerCalls = 0;
  agent.capability(CAPABILITY_KEY, {
    contract: fixtureContract(options.contract),
    handler: options.handler || (async ({ input }) => {
      handlerCalls += 1;
      return { outcome: 'completed', output: input };
    }),
  });
  const scope = {
    organizationScope: 'org_security',
    workspaceScope: 'workspace_security',
  };
  const grant = agent.issueInstallGrant({
    ...scope,
    allowedCapabilityKeys: [CAPABILITY_KEY],
  });
  const connection = agent.redeemInstallGrant(grant.key, {
    ...scope,
    approvedCapabilityKeys: [CAPABILITY_KEY],
    hostAudience: 'host-security-audience',
  });
  return {
    agent,
    connection,
    issuer,
    passport,
    stores,
    handlerCalls: () => handlerCalls,
  };
}

test('production construction requires transport auth, signed receipts, and every durable authority store', async () => {
  const issuer = await createSyntheticIssuer({ issuerId: 'https://issuer.example' });
  const passport = {
    ...fixturePassport(),
    authorizedAgentExecutionKeys: [
      issuer.toolkit.authorizeAgentExecutionKey(issuer.keyIds.execution),
    ],
  };
  const base = {
    mode: 'productionMode',
    publicBaseUrl: 'https://agent.example',
    passport,
    authorization: () => true,
    revocationResolver: () => ({ status: 'active', freshness: 'fresh' }),
    receiptIssuer: () => ({}),
    receiptVerificationJwks: stripTestOnly(issuer.toolkit.publishJwks()),
    agentSigner: issuer.keyProvider.signer(issuer.keyIds.execution),
    stores: createStores(),
  };
  assert.throws(
    () => createGhostBridgeAgent({ ...base, authenticateHttpRequest: undefined }),
    /authenticateHttpRequest/,
  );
  assert.throws(
    () =>
      createGhostBridgeAgent({
        ...base,
        authenticateHttpRequest: async () => ({}),
        stores: { ...base.stores, approvalDecisions: new Map() },
      }),
    /approvalDecisions store must be durable/,
  );
  assert.throws(
    () =>
      createGhostBridgeAgent({
        ...base,
        authenticateHttpRequest: async () => ({}),
        agentSigner: undefined,
      }),
    /verifiable signed Receipt configuration/,
  );
});

test('production authorization evidence and revocation freshness fail closed', async () => {
  const invalidDecision = await createProductionFixture({
    authorization: () => ({ allowed: true }),
  });
  await assert.rejects(
    () =>
      invalidDecision.agent.invoke(
        invalidDecision.connection.connectionId,
        invocation(invalidDecision.connection),
      ),
    (error) => error.errorCode === 'AUTHORIZATION_DENIED',
  );
  assert.equal(invalidDecision.handlerCalls(), 0);

  for (const [label, revocation] of [
    ['missing', undefined],
    ['missing freshness', { status: 'active' }],
    ['unknown', { status: 'unknown', freshness: 'fresh' }],
    ['revoked', { status: 'revoked', freshness: 'fresh' }],
    ['stale', { status: 'active', freshness: 'stale' }],
    ['unavailable', { status: 'active', freshness: 'unavailable' }],
    ['invalid sequence', { status: 'active', freshness: 'fresh', sequence: 0 }],
    ['wrong subject', {
      status: 'active',
      freshness: 'fresh',
      subjectType: 'connection',
      subjectReference: 'connection_other',
    }],
  ]) {
    const fixture = await createProductionFixture({
      revocationResolver: () => revocation,
    });
    await assert.rejects(
      () => fixture.agent.invoke(fixture.connection.connectionId, invocation(fixture.connection)),
      (error) => {
        assert.equal(error.errorCode, 'REVOKED', label);
        return true;
      },
    );
    assert.equal(fixture.handlerCalls(), 0, label);
  }

  for (const freshness of ['fresh', 'nearing_expiry']) {
    const fixture = await createProductionFixture({
      revocationResolver: () => ({ status: 'active', freshness }),
    });
    assert.equal(
      (await fixture.agent.invoke(
        fixture.connection.connectionId,
        invocation(fixture.connection),
      )).task.state,
      'completed',
    );
  }
});

test('production emits verified signed success and failure Receipts', async () => {
  let verificationFailure;
  const success = await createProductionFixture({
    receiptVerificationObserver: (failure) => {
      verificationFailure = failure;
    },
  });
  let completed;
  try {
    completed = await success.agent.invoke(
      success.connection.connectionId,
      invocation(success.connection),
    );
  } catch (error) {
    assert.fail(`Receipt verification failed: ${JSON.stringify(verificationFailure)} (${error.errorCode})`);
  }
  assert.equal(completed.receipt.outcome, 'completed');
  assert.equal(completed.receipt.agentExecutionKeyId, success.issuer.keyIds.execution);
  assert.ok(completed.receipt.proof.protectedJws);

  const failedFixture = await createProductionFixture({
    handler: async () => {
      throw new Error('private implementation detail');
    },
  });
  await assert.rejects(
    () =>
      failedFixture.agent.invoke(
        failedFixture.connection.connectionId,
        invocation(failedFixture.connection),
      ),
    (error) => {
      assert.equal(error.errorCode, 'INTERNAL_ERROR');
      assert.doesNotMatch(error.safeMessage, /private implementation detail/);
      return true;
    },
  );
  const failedTask = [...failedFixture.stores.tasks.values()].find(
    (task) => task.state === 'failed',
  );
  assert.ok(failedTask.receiptReference);
  const failureReceipt = failedFixture.stores.receipts.get(failedTask.receiptReference);
  assert.equal(failureReceipt.outcome, 'failed');
  assert.equal(failureReceipt.safeFailureCode, 'INTERNAL_ERROR');
  assert.ok(failureReceipt.proof.protectedJws);
});

test('production rejects unsigned, copied, mismatched, expired, and unauthorized Receipts', async () => {
  const cases = [
    ['unsigned', { unsignedReceipt: true }],
    ['wrong audience', {
      customSignedReceipt: (receipt) => ({ ...receipt, audience: 'wrong-host' }),
    }],
    ['output digest', {
      customSignedReceipt: (receipt) => ({ ...receipt, outputDigest: digest({ wrong: true }) }),
    }],
    ['evidence digest', {
      customSignedReceipt: (receipt) => ({ ...receipt, evidenceDigest: digest({ wrong: true }) }),
    }],
    ['invocation', {
      customSignedReceipt: (receipt) => ({ ...receipt, invocationId: 'invocation_other' }),
    }],
    ['Task', {
      customSignedReceipt: (receipt) => ({ ...receipt, taskId: 'task_other' }),
    }],
    ['scope', {
      customSignedReceipt: (receipt) => ({ ...receipt, organizationScope: 'org_other' }),
    }],
    ['expired', {
      customSignedReceipt: (receipt) => ({
        ...receipt,
        issuedAt: new Date(Date.now() - 120_000).toISOString(),
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    }],
  ];
  for (const [label, options] of cases) {
    const fixture = await createProductionFixture(options);
    await assert.rejects(
      () => fixture.agent.invoke(fixture.connection.connectionId, invocation(fixture.connection)),
      (error) => {
        assert.ok(['PROOF_REQUIRED', 'PROOF_INVALID'].includes(error.errorCode), label);
        return true;
      },
    );
  }

  const issuer = await createSyntheticIssuer({ issuerId: 'https://issuer.example' });
  const unauthorized = issuer.keyProvider.createKey({
    kid: 'test_execution_unauthorized',
    purpose: ['execution_receipt_signing'],
  });
  issuer.toolkit.prepublishKey(unauthorized.kid, 9);
  issuer.toolkit.activateKey(unauthorized.kid, 10);
  const unauthorizedFixture = await createProductionFixture({
    issuer,
    executionKeyId: unauthorized.kid,
    customSignedReceipt: (receipt) => ({
      ...receipt,
      agentExecutionKeyId: unauthorized.kid,
    }),
  });
  await assert.rejects(
    () =>
      unauthorizedFixture.agent.invoke(
        unauthorizedFixture.connection.connectionId,
        invocation(unauthorizedFixture.connection),
      ),
    (error) => error.errorCode === 'PROOF_INVALID',
  );

  const revokedJwks = stripTestOnly(issuer.toolkit.publishJwks());
  revokedJwks.keys = revokedJwks.keys.map((key) =>
    key.kid === issuer.keyIds.execution ? { ...key, state: 'revoked' } : key);
  const revokedFixture = await createProductionFixture({
    issuer,
    verificationJwks: revokedJwks,
    customSignedReceipt: (receipt) => receipt,
  });
  await assert.rejects(
    () =>
      revokedFixture.agent.invoke(
        revokedFixture.connection.connectionId,
        invocation(revokedFixture.connection),
      ),
    (error) => error.errorCode === 'PROOF_INVALID',
  );
});

test('production cancellation and timeout terminal states have signed Receipts', async () => {
  let runningTaskId;
  const stores = createStores();
  const originalSet = stores.tasks.set.bind(stores.tasks);
  stores.tasks.set = (key, value) => {
    if (value.state === 'running') runningTaskId = key;
    return originalSet(key, value);
  };
  const cancellation = await createProductionFixture({
    stores,
    handler: ({ context }) =>
      new Promise((resolve) => {
        context.signal.addEventListener(
          'abort',
          () => resolve({ outcome: 'cancelled' }),
          { once: true },
        );
      }),
  });
  const pending = cancellation.agent.invoke(
    cancellation.connection.connectionId,
    invocation(cancellation.connection),
  );
  while (!runningTaskId) await new Promise((resolve) => setImmediate(resolve));
  const cancelled = await cancellation.agent.cancelTask(runningTaskId);
  await assert.rejects(() => pending, (error) => error.errorCode === 'TASK_CANCELLED');
  const cancellationReceipt = stores.receipts.get(cancelled.receiptReference);
  assert.equal(cancellationReceipt.outcome, 'cancelled');
  assert.ok(cancellationReceipt.proof);

  const timeout = await createProductionFixture({
    contract: { timeoutBounds: { minimumMs: 1, maximumMs: 15 } },
    handler: async () => new Promise(() => {}),
  });
  await assert.rejects(
    () => timeout.agent.invoke(timeout.connection.connectionId, invocation(timeout.connection)),
    (error) => error.errorCode === 'DEADLINE_EXCEEDED',
  );
  const timedOutTask = [...timeout.stores.tasks.values()].find(
    (task) => task.state === 'timed_out',
  );
  const timeoutReceipt = timeout.stores.receipts.get(timedOutTask.receiptReference);
  assert.equal(timeoutReceipt.outcome, 'timed_out');
  assert.ok(timeoutReceipt.proof);
});

test('durable Approval Decision consumption is atomic across competing executions', async () => {
  let executions = 0;
  const fixture = await createProductionFixture({
    contract: { approvalRequirement: 'required' },
    handler: async ({ input }) => {
      executions += 1;
      await new Promise((resolve) => setImmediate(resolve));
      return { outcome: 'completed', output: input };
    },
  });
  const envelope = invocation(fixture.connection, {
    invocationId: 'invocation_atomic_approval',
  });
  const waiting = await fixture.agent.invoke(fixture.connection.connectionId, envelope);
  assert.equal(waiting.task.state, 'waiting_for_approval');
  const decision = {
    challengeId: waiting.approvalChallenge.challengeId,
    decisionId: 'decision_atomic_approval',
    decision: 'approved',
    approvedLimits: {},
    decidedBy: 'host_approver',
    decidedAt: new Date().toISOString(),
    safeReasonCode: 'APPROVED_FOR_TEST',
  };
  await fixture.agent.submitApprovalDecision(decision);
  const approvedEnvelope = {
    ...envelope,
    approvalReference: decision.decisionId,
  };
  const results = await Promise.all([
    fixture.agent.invoke(fixture.connection.connectionId, approvedEnvelope),
    fixture.agent.invoke(fixture.connection.connectionId, approvedEnvelope),
  ]);
  assert.equal(executions, 1);
  assert.equal(results.filter((result) => result.task.state === 'completed').length, 1);
  assert.equal(
    results.filter((result) => result.task.state === 'waiting_for_approval').length,
    1,
  );
});
