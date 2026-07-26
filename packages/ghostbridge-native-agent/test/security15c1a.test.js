'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
  createFileProtocolStores,
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
    fixtureHttpPrincipal: options.fixtureHttpPrincipal,
    authorizationTimeoutMs: options.authorizationTimeoutMs,
  });
  agent.capability(CAPABILITY_KEY, {
    contract: fixtureContract(options.contract),
    ...(options.approvalLimits
      ? { approvalLimits: options.approvalLimits }
      : {}),
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

function createStores(directory) {
  return createFileProtocolStores({
    directory:
      directory ||
      fs.mkdtempSync(path.join(os.tmpdir(), 'ghostbridge-agent-15c1a-')),
  });
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
  let connection;
  if (options.skipInstall !== true) {
    const grant = await agent.issueInstallGrant({
      ...scope,
      allowedCapabilityKeys: [CAPABILITY_KEY],
    });
    connection = await agent.redeemInstallGrant(grant.key, {
      ...scope,
      approvedCapabilityKeys: [CAPABILITY_KEY],
      hostAudience: 'host-security-audience',
    });
  }
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
    /approvalDecisions store must be an asynchronous durable adapter/,
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
  const failedTask = (await failedFixture.stores.tasks.values()).find(
    (task) => task.state === 'failed',
  );
  assert.ok(failedTask.receiptReference);
  const failureReceipt = await failedFixture.stores.receipts.get(failedTask.receiptReference);
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
  const originalPut = stores.tasks.put.bind(stores.tasks);
  stores.tasks.put = async (key, value) => {
    if (value.state === 'running') runningTaskId = key;
    return originalPut(key, value);
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
  const cancellationReceipt = await stores.receipts.get(cancelled.receiptReference);
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
  const timedOutTask = (await timeout.stores.tasks.values()).find(
    (task) => task.state === 'timed_out',
  );
  const timeoutReceipt = await timeout.stores.receipts.get(timedOutTask.receiptReference);
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
    approvalActionDigest: waiting.approvalChallenge.approvalActionDigest,
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

async function prepareApprovedInvocation(options = {}) {
  const fixture = await createProductionFixture({
    contract: {
      approvalRequirement: 'required',
      sideEffectCategory: 'irreversible_write',
      ...(options.contract || {}),
    },
    approvalLimits: options.approvalLimits,
  });
  const envelope = invocation(fixture.connection, {
    invocationId:
      options.invocationId ||
      `invocation_r1_${Math.random().toString(16).slice(2)}`,
    idempotencyKey: `idempotency_r1_${Math.random().toString(16).slice(2)}`,
    payload: options.payload || {
      amount: 1250,
      beneficiary: { accountId: 'approved', routing: 'domestic' },
    },
  });
  const waiting = await fixture.agent.invoke(
    fixture.connection.connectionId,
    envelope,
  );
  const decision = {
    challengeId: waiting.approvalChallenge.challengeId,
    decisionId: `decision_r1_${Math.random().toString(16).slice(2)}`,
    decision: 'approved',
    approvalActionDigest: waiting.approvalChallenge.approvalActionDigest,
    approvedLimits: {},
    decidedBy: 'host_approver',
    decidedAt: new Date().toISOString(),
    safeReasonCode: 'APPROVED_FOR_R1',
  };
  await fixture.agent.submitApprovalDecision(decision);
  return {
    ...fixture,
    envelope,
    waiting,
    decision,
    approvedEnvelope: {
      ...envelope,
      approvalReference: decision.decisionId,
    },
  };
}

test('R1 exact-action approval accepts only the canonical approved invocation', async () => {
  const exact = await prepareApprovedInvocation();
  const reordered = {
    ...exact.approvedEnvelope,
    payload: {
      beneficiary: { routing: 'domestic', accountId: 'approved' },
      amount: 1250,
    },
  };
  const completed = await exact.agent.invoke(
    exact.connection.connectionId,
    reordered,
  );
  assert.equal(completed.task.state, 'completed');
  assert.equal(exact.handlerCalls(), 1);

  for (const [label, mutate] of [
    ['changed amount', (prepared) => ({
      ...prepared.approvedEnvelope,
      payload: { ...prepared.approvedEnvelope.payload, amount: 1251 },
    })],
    ['changed nested field', (prepared) => ({
      ...prepared.approvedEnvelope,
      payload: {
        ...prepared.approvedEnvelope.payload,
        beneficiary: {
          ...prepared.approvedEnvelope.payload.beneficiary,
          accountId: 'substituted',
        },
      },
    })],
  ]) {
    const prepared = await prepareApprovedInvocation();
    const rejected = await prepared.agent.invoke(
      prepared.connection.connectionId,
      mutate(prepared),
    );
    assert.equal(rejected.task.state, 'waiting_for_approval', label);
    assert.equal(prepared.handlerCalls(), 0, label);
  }
});

test('R1 exact-action approval binds capability, Connection, contract, scope, and limits', async () => {
  const changedVersion = await prepareApprovedInvocation();
  await assert.rejects(
    () =>
      changedVersion.agent.invoke(
        changedVersion.connection.connectionId,
        { ...changedVersion.approvedEnvelope, capabilityVersion: '2' },
      ),
    (error) => error.errorCode === 'CAPABILITY_VERSION_MISMATCH',
  );
  assert.equal(changedVersion.handlerCalls(), 0);

  const changedContract = await prepareApprovedInvocation();
  await assert.rejects(
    () =>
      changedContract.agent.invoke(
        changedContract.connection.connectionId,
        {
          ...changedContract.approvedEnvelope,
          inputContractReference: 'data:other-input@1',
        },
      ),
    (error) => error.errorCode === 'DATA_CONTRACT_VIOLATION',
  );

  const changedScope = await prepareApprovedInvocation();
  await assert.rejects(
    () =>
      changedScope.agent.invoke(
        changedScope.connection.connectionId,
        { ...changedScope.approvedEnvelope, workspaceScope: 'workspace_other' },
      ),
    (error) => error.errorCode === 'SCOPE_MISMATCH',
  );

  const changedConnection = await prepareApprovedInvocation();
  const secondGrant = await changedConnection.agent.issueInstallGrant({
    organizationScope: changedConnection.connection.organizationScope,
    workspaceScope: changedConnection.connection.workspaceScope,
    allowedCapabilityKeys: [CAPABILITY_KEY],
  });
  const secondConnection = await changedConnection.agent.redeemInstallGrant(
    secondGrant.key,
    {
      organizationScope: changedConnection.connection.organizationScope,
      workspaceScope: changedConnection.connection.workspaceScope,
      approvedCapabilityKeys: [CAPABILITY_KEY],
      hostAudience: 'host-security-audience',
    },
  );
  const connectionRejected = await changedConnection.agent.invoke(
    secondConnection.connectionId,
    changedConnection.approvedEnvelope,
  );
  assert.equal(connectionRejected.task.state, 'waiting_for_approval');
  assert.equal(changedConnection.handlerCalls(), 0);

  const changedLimits = await prepareApprovedInvocation({
    approvalLimits: { maximumAmount: 2000 },
  });
  changedLimits.agent.capability(CAPABILITY_KEY, {
    contract: fixtureContract({
      approvalRequirement: 'required',
      sideEffectCategory: 'irreversible_write',
    }),
    approvalLimits: { maximumAmount: 1000 },
    handler: async ({ input }) => ({ outcome: 'completed', output: input }),
  });
  const limitsRejected = await changedLimits.agent.invoke(
    changedLimits.connection.connectionId,
    changedLimits.approvedEnvelope,
  );
  assert.equal(limitsRejected.task.state, 'waiting_for_approval');
});

test('R1 approval Decisions reject missing and malformed action digests', async () => {
  const prepared = await createProductionFixture({
    contract: { approvalRequirement: 'required' },
  });
  const waiting = await prepared.agent.invoke(
    prepared.connection.connectionId,
    invocation(prepared.connection),
  );
  const base = {
    challengeId: waiting.approvalChallenge.challengeId,
    decisionId: 'decision_missing_digest_r1',
    decision: 'approved',
    approvedLimits: {},
    decidedBy: 'host_approver',
    decidedAt: new Date().toISOString(),
    safeReasonCode: 'APPROVED_FOR_R1',
  };
  await assert.rejects(
    () => prepared.agent.submitApprovalDecision(base),
    (error) =>
      ['INVALID_MESSAGE', 'APPROVAL_INVALID'].includes(error.errorCode),
  );
  await assert.rejects(
    () =>
      prepared.agent.submitApprovalDecision({
        ...base,
        decisionId: 'decision_malformed_digest_r1',
        approvalActionDigest: 'malformed',
      }),
    (error) => error.errorCode === 'APPROVAL_INVALID',
  );
});

test('R1 waiting-for-approval cancellation is signed, atomic, and idempotent', async () => {
  const fixture = await createProductionFixture({
    contract: { approvalRequirement: 'required' },
  });
  const waiting = await fixture.agent.invoke(
    fixture.connection.connectionId,
    invocation(fixture.connection),
  );
  const [first, concurrent] = await Promise.all([
    fixture.agent.cancelTask(waiting.task.taskId),
    fixture.agent.cancelTask(waiting.task.taskId),
  ]);
  const second = await fixture.agent.cancelTask(waiting.task.taskId);
  assert.equal(first.state, 'cancelled');
  assert.equal(concurrent.receiptReference, first.receiptReference);
  assert.equal(second.receiptReference, first.receiptReference);
  const receipt = await fixture.stores.receipts.get(first.receiptReference);
  assert.equal(receipt.outcome, 'cancelled');
  assert.ok(receipt.proof);
  assert.equal((await fixture.stores.receipts.values()).length, 1);
});

test('R1 accepted Task cancellation persists one signed terminal pair', async () => {
  const stores = createStores();
  let acceptedTaskId;
  let releaseContext;
  const contextGate = new Promise((resolve) => {
    releaseContext = resolve;
  });
  const originalTaskPut = stores.tasks.put.bind(stores.tasks);
  stores.tasks.put = async (key, value) => {
    await originalTaskPut(key, value);
    if (value.state === 'accepted') acceptedTaskId = key;
  };
  const originalContextPut = stores.taskContexts.put.bind(stores.taskContexts);
  let contextPersisted = false;
  stores.taskContexts.put = async (key, value) => {
    await originalContextPut(key, value);
    contextPersisted = true;
    await contextGate;
  };
  const fixture = await createProductionFixture({ stores });
  const pending = fixture.agent.invoke(
    fixture.connection.connectionId,
    invocation(fixture.connection),
  );
  while (!acceptedTaskId || !contextPersisted) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  const cancelled = await fixture.agent.cancelTask(acceptedTaskId);
  releaseContext();
  await assert.rejects(
    () => pending,
    (error) => error.errorCode === 'TASK_CANCELLED',
  );
  assert.equal(cancelled.state, 'cancelled');
  assert.ok((await stores.receipts.get(cancelled.receiptReference)).proof);
});

test('R1 terminal failures cannot commit a terminal Task without its Receipt', async () => {
  const issuanceFailure = await createProductionFixture({
    receiptIssuer: async () => {
      throw new Error('private signer failure');
    },
  });
  await assert.rejects(() =>
    issuanceFailure.agent.invoke(
      issuanceFailure.connection.connectionId,
      invocation(issuanceFailure.connection),
    ),
  );
  assert.equal(
    (await issuanceFailure.stores.tasks.values()).some((task) =>
      ['completed', 'failed', 'cancelled', 'timed_out'].includes(task.state),
    ),
    false,
  );
  assert.equal((await issuanceFailure.stores.receipts.values()).length, 0);

  const persistenceFailureStores = createStores();
  persistenceFailureStores.terminalTransactions.commitTerminal = async () => {
    throw new Error('persistent adapter unavailable');
  };
  const persistenceFailure = await createProductionFixture({
    stores: persistenceFailureStores,
  });
  await assert.rejects(
    () =>
      persistenceFailure.agent.invoke(
        persistenceFailure.connection.connectionId,
        invocation(persistenceFailure.connection),
      ),
    (error) => error.errorCode === 'TERMINAL_PERSISTENCE_REQUIRED',
  );
  assert.equal((await persistenceFailureStores.receipts.values()).length, 0);
  assert.equal(
    (await persistenceFailureStores.tasks.values()).some((task) =>
      ['completed', 'failed', 'cancelled', 'timed_out'].includes(task.state),
    ),
    false,
  );

  const recoveryStores = createStores();
  recoveryStores.terminalTransactions.commitTerminal = async () => ({
    committed: false,
    recoveryRequired: true,
    reasonCode: 'TASK_WRITE_FAILED',
  });
  const recovery = await createProductionFixture({ stores: recoveryStores });
  await assert.rejects(
    () =>
      recovery.agent.invoke(
        recovery.connection.connectionId,
        invocation(recovery.connection),
      ),
    (error) =>
      error.errorCode === 'TERMINAL_PERSISTENCE_REQUIRED' &&
      error.details?.recoveryRequired === true,
  );
  assert.equal((await recoveryStores.receipts.values()).length, 0);
});

test('R1 filesystem store rejects invalid terminal pairs and survives restart', async (context) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ghostbridge-agent-restart-r1-'),
  );
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const storesA = createStores(directory);
  await assert.rejects(
    () =>
      storesA.terminalTransactions.commitTerminal({
        task: {
          taskId: 'task_invalid_pair',
          state: 'cancelled',
          receiptReference: 'receipt_invalid_pair',
        },
        receipt: {
          receiptId: 'receipt_other',
          taskId: 'task_other',
        },
        expectedTaskStates: ['running'],
      }),
    /invalid/,
  );

  const agentA = await createProductionFixture({
    stores: storesA,
    contract: { approvalRequirement: 'required' },
  });
  const preparedEnvelope = invocation(agentA.connection, {
    invocationId: 'invocation_restart_r1',
  });
  const waiting = await agentA.agent.invoke(
    agentA.connection.connectionId,
    preparedEnvelope,
  );
  const decision = {
    challengeId: waiting.approvalChallenge.challengeId,
    decisionId: 'decision_restart_r1',
    decision: 'approved',
    approvalActionDigest: waiting.approvalChallenge.approvalActionDigest,
    approvedLimits: {},
    decidedBy: 'host_approver',
    decidedAt: new Date().toISOString(),
    safeReasonCode: 'APPROVED_FOR_RESTART',
  };
  await agentA.agent.submitApprovalDecision(decision);
  const completed = await agentA.agent.invoke(
    agentA.connection.connectionId,
    { ...preparedEnvelope, approvalReference: decision.decisionId },
  );
  await storesA.close();

  const storesB = createStores(directory);
  const agentB = await createProductionFixture({
    stores: storesB,
    issuer: agentA.issuer,
    contract: { approvalRequirement: 'required' },
    skipInstall: true,
  });
  assert.equal(
    (await agentB.agent.getTask(completed.task.taskId)).receiptReference,
    completed.receipt.receiptId,
  );
  assert.equal(
    (await agentB.agent.getReceipt(completed.receipt.receiptId)).taskId,
    completed.task.taskId,
  );
  assert.equal(
    (await agentB.agent.checkRevocation(
      'connection',
      agentA.connection.connectionId,
    )).status,
    'active',
  );
  assert.equal(
    (await storesB.approvalDecisions.get(decision.decisionId)).used,
    true,
  );
  assert.equal(await agentB.agent.getConnectionCount(), 1);
  await storesB.close();
});

test('R1 production rejects a metadata-decorated Map wrapper', async () => {
  const issuer = await createSyntheticIssuer({ issuerId: 'https://issuer.example' });
  const stores = createStores();
  const wrappedMap = {
    capabilities: {
      persistence: 'durable',
      atomicCompareAndSet: true,
      transactionalTerminalWrite: false,
      adapterName: 'claimed-durable-adapter',
      adapterVersion: '1',
    },
    records: new Map(),
    async get(key) { return this.records.get(key); },
    async put(key, value) { this.records.set(key, value); },
    async delete(key) { return this.records.delete(key); },
    async has(key) { return this.records.has(key); },
    async compareAndSet() { return true; },
    async values() { return [...this.records.values()]; },
  };
  assert.throws(
    () =>
      createGhostBridgeAgent({
        mode: 'productionMode',
        publicBaseUrl: 'https://agent.example',
        passport: {
          ...fixturePassport(),
          authorizedAgentExecutionKeys: [
            issuer.toolkit.authorizeAgentExecutionKey(issuer.keyIds.execution),
          ],
        },
        authorization: () => true,
        revocationResolver: () => ({ status: 'active', freshness: 'fresh' }),
        receiptIssuer: () => ({}),
        receiptVerificationJwks: stripTestOnly(issuer.toolkit.publishJwks()),
        agentSigner: issuer.keyProvider.signer(issuer.keyIds.execution),
        authenticateHttpRequest: async () => ({}),
        stores: { ...stores, connections: wrappedMap },
      }),
    /connections store must be an asynchronous durable adapter/,
  );
});

test('R1 unknown Connection revocation is never reported active', async (context) => {
  const fixture = fixtureSecurityAgent({
    fixtureHttpPrincipal: {
      subjectId: 'host_r1',
      authenticationMethod: 'fixture',
      organizationScope: 'org_revocation_r1',
    },
  });
  const scope = { organizationScope: 'org_revocation_r1' };
  const grant = fixture.agent.issueInstallGrant(scope);
  const connection = fixture.agent.redeemInstallGrant(grant.key, scope);
  assert.equal(
    fixture.agent.checkRevocation('connection', connection.connectionId).status,
    'active',
  );
  assert.throws(
    () => fixture.agent.checkRevocation('connection', 'connection_unknown_r1'),
    (error) => error.errorCode === 'CONNECTION_NOT_ACTIVE',
  );
  assert.throws(
    () => fixture.agent.checkRevocation('connection', ''),
    (error) => error.errorCode === 'INVALID_MESSAGE',
  );
  fixture.agent.revokeConnection(connection.connectionId);
  assert.equal(
    fixture.agent.checkRevocation('connection', connection.connectionId).status,
    'revoked',
  );

  const listener = await fixture.agent.listen();
  context.after(() => listener.close());
  const response = await fetch(
    `${listener.baseUrl}/ghostbridge/revocations/connection/connection_unknown_r1`,
  );
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.errorCode, 'CONNECTION_NOT_ACTIVE');
  const missingResponse = await fetch(
    `${listener.baseUrl}/ghostbridge/revocations/connection/`,
  );
  const missingBody = await missingResponse.json();
  assert.equal(missingResponse.status, 404);
  assert.equal(missingBody.errorCode, 'INVALID_MESSAGE');
});
