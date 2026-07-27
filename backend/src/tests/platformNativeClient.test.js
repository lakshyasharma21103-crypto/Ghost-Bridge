'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const {
  createGhostBridgeClient,
} = require('@ghostbridge/native-client');
const {
  createTrustedCodeForgeProvider,
} = require('@ghostbridge/example-codeforge-provider');
const {
  FIXTURE_OPT_IN_HEADER,
  createPlatformNativeClientAdapter,
} = require('../services/platformNativeClient.service');
const {
  createPlatformNativeClientRouter,
} = require('../routes/platformNativeClientRoutes');

const BINDING_SECRET = 'phase-15c2-platform-binding-secret-at-least-32-bytes';
const HOST_AUDIENCE = 'ghostbridge-platform';
const SCOPE = Object.freeze({
  organizationScope: 'organization_phase15c2',
  workspaceScope: 'workspace_phase15c2',
});
const PRINCIPAL = Object.freeze({
  subjectType: 'user',
  subjectId: 'user:phase15c2',
  userId: 'user_phase15c2',
  organizationId: SCOPE.organizationScope,
  permittedOrganizationIds: Object.freeze([SCOPE.organizationScope]),
  permittedWorkspaceIds: Object.freeze([SCOPE.workspaceScope]),
  workspaceOrganizationIds: Object.freeze({
    [SCOPE.workspaceScope]: SCOPE.organizationScope,
  }),
  authenticationMethod: 'test_host_principal',
});

function platformContext(principal = PRINCIPAL) {
  return {
    principal,
    requestId: 'request_phase15c2',
    traceId: 'trace_phase15c2',
    fixtureOptIn: true,
  };
}

async function trustedFixture(options = {}) {
  const epoch = Date.now();
  const providerClock = () => epoch;
  const provider = await createTrustedCodeForgeProvider({
    hostAudience: HOST_AUDIENCE,
    clock: providerClock,
    ...(options.approvalRequired
      ? {
          contract: { approvalRequirement: 'required' },
          capabilityHandler: async ({ input }) => ({
            outcome: 'completed',
            output: {
              projectId: `approved_${input.projectName.toLowerCase()}`,
              projectName: input.projectName,
              template: input.template,
              state: 'created',
            },
          }),
        }
      : {}),
  });
  const listener = await provider.listen();
  let revocationSet = provider.publicTrust.revocationSet;
  let trustClock = options.trustClock || providerClock;
  let clientCreations = 0;
  const adapter = createPlatformNativeClientAdapter({
    environment: options.environment || 'development',
    allowDevelopmentFixtures: true,
    bindingSecret: BINDING_SECRET,
    hostAudience: HOST_AUDIENCE,
    timeoutMs: options.timeoutMs || 2_000,
    maximumResponseBytes: options.maximumResponseBytes || 131_072,
    clientFactory(configuration) {
      clientCreations += 1;
      return createGhostBridgeClient(configuration);
    },
    authenticationHandler: async () => ({
      credentialReference: 'credential_binding_phase15c2',
    }),
    trustProvider: async () => {
      const issuerId = provider.publicTrust.metadata.issuerId;
      return {
        required: true,
        localTestMode: true,
        allowedLocalIssuers: [issuerId],
        hostAudience: HOST_AUDIENCE,
        metadata: provider.publicTrust.metadata,
        jwks: provider.publicTrust.jwks,
        revocationSet,
        allowSignedCheckpoint: true,
        clock: trustClock,
        organizationPolicy: {
          version: '1',
          allowedIssuerIds: [issuerId],
          pinnedRootThumbprints: provider.publicTrust.metadata.rootKeyThumbprints,
          acceptedAlgorithms: ['EdDSA'],
          unknownIssuerBehavior: 'block',
        },
        workspacePolicy: {
          version: '1',
          allowedIssuerIds: [issuerId],
          blockedIssuerIds: [],
          unknownIssuerBehavior: 'block',
        },
      };
    },
  });
  return {
    adapter,
    listener,
    provider,
    clientCreations: () => clientCreations,
    setRevocationSet(value) {
      revocationSet = value;
    },
    setTrustClock(value) {
      trustClock = value;
    },
  };
}

async function install(fixture) {
  const grant = await fixture.provider.issueInstallGrant(SCOPE);
  return fixture.adapter.install(
    {
      baseUrl: fixture.listener.baseUrl,
      fixture: true,
      grant: grant.key,
      approvedCapabilityKeys: ['codeforge.create_app'],
      ...SCOPE,
    },
    platformContext(),
  );
}

async function listenPlatform(adapter, principal = PRINCIPAL) {
  const app = express();
  app.use(express.json());
  app.locals.platformNativeClientAdapter = adapter;
  app.use((request, _response, next) => {
    request.requestId = 'request_phase15c2_http';
    request.traceId = 'trace_phase15c2_http';
    next();
  });
  app.use(
    '/api/v1/platform-native',
    createPlatformNativeClientRouter({
      authenticate(request, _response, next) {
        request.authenticatedPrincipal = principal;
        next();
      },
    }),
  );
  app.use((error, _request, response, _next) => {
    response.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'INTERNAL_SERVER_ERROR', message: error.message },
    });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function post(origin, path, body) {
  const response = await fetch(`${origin}/api/v1/platform-native${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [FIXTURE_OPT_IN_HEADER]: '1',
    },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('Platform HTTP path discovers, installs, invokes, and verifies through the public Native Client', async (context) => {
  const fixture = await trustedFixture();
  const platform = await listenPlatform(fixture.adapter);
  context.after(async () => {
    await platform.close();
    await fixture.listener.close();
  });

  const discovery = await post(platform.origin, '/discovery', {
    baseUrl: fixture.listener.baseUrl,
    fixture: true,
    ...SCOPE,
  });
  assert.equal(discovery.response.status, 200);
  assert.equal(discovery.body.data.nativeClientPath, true);
  assert.equal(discovery.body.data.agent.agentId, 'codeforge-development-agent');
  assert.equal(discovery.body.data.trust.category, 'verified_and_trusted');
  assert.deepEqual(discovery.body.data.protocol.endpointNames.sort(), [
    'approvals',
    'capabilities',
    'capabilityDetails',
    'capabilitySearch',
    'installGrantRedemption',
    'installGrantResolution',
    'invocations',
    'passport',
    'receipts',
    'revocations',
    'tasks',
  ]);

  const grant = await fixture.provider.issueInstallGrant(SCOPE);
  const installation = await post(platform.origin, '/install', {
    baseUrl: fixture.listener.baseUrl,
    fixture: true,
    grant: grant.key,
    approvedCapabilityKeys: ['codeforge.create_app'],
    ...SCOPE,
  });
  assert.equal(installation.response.status, 201);
  assert.equal(installation.body.data.connection.status, 'active');
  const connectionBinding = installation.body.data.connectionBinding;

  const invocation = await post(platform.origin, '/invoke', {
    connectionBinding,
    capabilityKey: 'codeforge.create_app',
    capabilityVersion: '1.0.0',
    idempotencyKey: 'phase15c2-http-invocation',
    input: { projectName: 'Platform Dogfood', template: 'api' },
    payloadClassification: ['development.project_request'],
    ...SCOPE,
  });
  assert.equal(invocation.response.status, 200);
  assert.equal(invocation.body.data.nativeClientPath, true);
  assert.equal(invocation.body.data.task.state, 'completed');
  assert.equal(invocation.body.data.output.projectName, 'Platform Dogfood');
  assert.equal(invocation.body.data.verification.proofState, 'valid');

  const receipt = await post(platform.origin, '/receipts/verify', {
    taskBinding: invocation.body.data.taskBinding,
    output: invocation.body.data.output,
    ...SCOPE,
  });
  assert.equal(receipt.response.status, 200);
  assert.equal(receipt.body.data.verification.valid, true);
  const taskResult = await post(platform.origin, '/tasks/result', {
    taskBinding: invocation.body.data.taskBinding,
    ...SCOPE,
  });
  assert.equal(taskResult.response.status, 200);
  assert.equal(taskResult.body.data.task.state, 'completed');
  assert.equal(taskResult.body.data.verification.valid, true);
  assert.ok(fixture.clientCreations() >= 4);
  assert.doesNotMatch(JSON.stringify(receipt.body), /credential_binding_phase15c2/);
});

test('exact-action approval continuation rejects mutation and replay and cancellation requires a signed Receipt', async (context) => {
  const fixture = await trustedFixture({ approvalRequired: true });
  context.after(() => fixture.listener.close());
  const installation = await install(fixture);
  const input = { projectName: 'Approval Bound', template: 'web' };
  const waiting = await fixture.adapter.invoke(
    {
      connectionBinding: installation.connectionBinding,
      capabilityKey: 'codeforge.create_app',
      capabilityVersion: '1.0.0',
      idempotencyKey: 'phase15c2-approval',
      input,
      payloadClassification: ['development.project_request'],
      ...SCOPE,
    },
    platformContext(),
  );
  assert.equal(waiting.task.state, 'waiting_for_approval');
  assert.ok(waiting.approvalBinding);

  const taskStatus = await fixture.adapter.getTask(
    { taskBinding: waiting.taskBinding, ...SCOPE },
    platformContext(),
  );
  assert.equal(taskStatus.task.state, 'waiting_for_approval');

  const decision = {
    challengeId: waiting.approvalChallenge.challengeId,
    decisionId: 'decision_phase15c2_exact',
    decision: 'approved',
    approvalActionDigest: waiting.approvalChallenge.approvalActionDigest,
    approvedLimits: {},
    decidedBy: PRINCIPAL.userId,
    safeReasonCode: 'APPROVED_EXACT_ACTION',
  };
  await assert.rejects(
    () =>
      fixture.adapter.continueApproval(
        {
          approvalBinding: waiting.approvalBinding,
          input: { ...input, template: 'worker' },
          decision,
          ...SCOPE,
        },
        platformContext(),
      ),
    (error) => error.code === 'APPROVAL_INVALID',
  );
  const completed = await fixture.adapter.continueApproval(
    {
      approvalBinding: waiting.approvalBinding,
      input,
      decision,
      ...SCOPE,
    },
    platformContext(),
  );
  assert.equal(completed.task.state, 'completed');
  assert.equal(completed.verification.valid, true);
  await assert.rejects(
    () =>
      fixture.adapter.continueApproval(
        { approvalBinding: waiting.approvalBinding, input, decision, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'APPROVAL_INVALID',
  );

  const secondWaiting = await fixture.adapter.invoke(
    {
      connectionBinding: installation.connectionBinding,
      capabilityKey: 'codeforge.create_app',
      idempotencyKey: 'phase15c2-cancellation',
      input: { projectName: 'Cancel Me', template: 'worker' },
      payloadClassification: ['development.project_request'],
      ...SCOPE,
    },
    platformContext(),
  );
  const cancelled = await fixture.adapter.cancelTask(
    { taskBinding: secondWaiting.taskBinding, ...SCOPE },
    platformContext(),
  );
  assert.equal(cancelled.task.state, 'cancelled');
  assert.equal(cancelled.receipt.outcome, 'cancelled');
  assert.equal(cancelled.verification.proofState, 'valid');
});

test('Receipt digest mismatches and cross-tenant Task access fail closed', async (context) => {
  const fixture = await trustedFixture();
  context.after(() => fixture.listener.close());
  const installation = await install(fixture);
  const invocation = await fixture.adapter.invoke(
    {
      connectionBinding: installation.connectionBinding,
      capabilityKey: 'codeforge.create_app',
      idempotencyKey: 'phase15c2-receipt-digest',
      input: { projectName: 'Digest Bound', template: 'api' },
      payloadClassification: ['development.project_request'],
      ...SCOPE,
    },
    platformContext(),
  );
  await assert.rejects(
    () =>
      fixture.adapter.verifyReceipt(
        {
          taskBinding: invocation.taskBinding,
          output: { ...invocation.output, state: 'tampered' },
          ...SCOPE,
        },
        platformContext(),
      ),
    (error) => error.code === 'RECEIPT_INVALID',
  );
  await assert.rejects(
    () =>
      fixture.adapter.verifyReceipt(
        {
          taskBinding: invocation.taskBinding,
          output: invocation.output,
          evidence: { substituted: true },
          ...SCOPE,
        },
        platformContext(),
      ),
    (error) => error.code === 'RECEIPT_INVALID',
  );
  const otherPrincipal = {
    ...PRINCIPAL,
    subjectId: 'user:other',
    userId: 'user_other',
  };
  await assert.rejects(
    () =>
      fixture.adapter.getTask(
        { taskBinding: invocation.taskBinding, ...SCOPE },
        platformContext(otherPrincipal),
      ),
    (error) => error.code === 'AUTHORIZATION_DENIED',
  );
});

test('untrusted issuer, stale revocation state, and revoked Connection are rejected on the live path', async (context) => {
  const untrusted = await trustedFixture();
  context.after(() => untrusted.listener.close());
  const issuerId = untrusted.provider.publicTrust.metadata.issuerId;
  untrusted.adapter.trustProvider = async () => ({
    required: true,
    localTestMode: true,
    allowedLocalIssuers: [issuerId],
    hostAudience: HOST_AUDIENCE,
    metadata: untrusted.provider.publicTrust.metadata,
    jwks: untrusted.provider.publicTrust.jwks,
    revocationSet: untrusted.provider.publicTrust.revocationSet,
    organizationPolicy: {
      version: '1',
      allowedIssuerIds: [],
      unknownIssuerBehavior: 'block',
    },
    workspacePolicy: {
      version: '1',
      allowedIssuerIds: [],
      unknownIssuerBehavior: 'block',
    },
  });
  await assert.rejects(
    () =>
      untrusted.adapter.discover(
        { baseUrl: untrusted.listener.baseUrl, fixture: true, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'AGENT_NOT_TRUSTED',
  );

  const stale = await trustedFixture({
    trustClock: () => Date.now() + 10 * 60_000,
  });
  context.after(() => stale.listener.close());
  await assert.rejects(
    () =>
      stale.adapter.discover(
        { baseUrl: stale.listener.baseUrl, fixture: true, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'REVOCATION_STATE_STALE',
  );

  const revoked = await trustedFixture();
  context.after(() => revoked.listener.close());
  const installation = await install(revoked);
  revoked.setRevocationSet(
    await revoked.provider.revokeConnectionTrust(
      installation.connection.connectionId,
    ),
  );
  await assert.rejects(
    () =>
      revoked.adapter.invoke(
        {
          connectionBinding: installation.connectionBinding,
          capabilityKey: 'codeforge.create_app',
          idempotencyKey: 'phase15c2-revoked',
          input: { projectName: 'Revoked', template: 'api' },
          payloadClassification: ['development.project_request'],
          ...SCOPE,
        },
        platformContext(),
      ),
    (error) => error.code === 'AGENT_REVOKED',
  );
});

test('invalid Agent Passport signature is rejected through Platform discovery', async (context) => {
  const fixture = await trustedFixture();
  context.after(() => fixture.listener.close());
  const sourceDiscovery = fixture.provider.agent.getDiscovery();
  const discovery = {
    ...sourceDiscovery,
    endpoints: Object.fromEntries(
      Object.entries(sourceDiscovery.endpoints).map(([key, value]) => [
        key,
        new URL(value, fixture.listener.baseUrl).pathname,
      ]),
    ),
  };
  const passportPath = discovery.endpoints.passport;
  const jwsParts = fixture.provider.publicTrust.passport.proof.protectedJws.split('.');
  const signatureBytes = Buffer.from(jwsParts[2], 'base64url');
  signatureBytes[0] ^= 0x01;
  const tamperedJws = `${jwsParts[0]}.${jwsParts[1]}.${signatureBytes.toString('base64url')}`;
  const tamperedPassport = {
    ...fixture.provider.publicTrust.passport,
    proof: {
      ...fixture.provider.publicTrust.passport.proof,
      protectedJws: tamperedJws,
    },
  };
  const server = http.createServer((request, response) => {
    let document;
    if (request.url === '/.well-known/ghostbridge') document = discovery;
    else if (request.url === passportPath) document = tamperedPassport;
    else {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ errorCode: 'TASK_NOT_FOUND', safeMessage: 'Not found.' }));
      return;
    }
    const body = JSON.stringify(document);
    response.writeHead(200, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await assert.rejects(
    () =>
      fixture.adapter.discover(
        {
          baseUrl: `http://127.0.0.1:${server.address().port}`,
          fixture: true,
          ...SCOPE,
        },
        platformContext(),
      ),
    (error) => error.code === 'AGENT_NOT_TRUSTED',
  );
});

function listenDiscoveryDocument(document, options = {}) {
  const server = http.createServer((_request, response) => {
    const send = () => {
      const body =
        typeof document === 'string' ? document : JSON.stringify(document);
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      });
      response.end(body);
    };
    if (options.delayMs) setTimeout(send, options.delayMs);
    else send();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function fixtureAdapter(options = {}) {
  return createPlatformNativeClientAdapter({
    environment: options.environment || 'development',
    allowDevelopmentFixtures: true,
    bindingSecret: BINDING_SECRET,
    timeoutMs: options.timeoutMs || 500,
    maximumResponseBytes: options.maximumResponseBytes || 4_096,
    trustProvider: async () => ({ required: false, hostAudience: HOST_AUDIENCE }),
  });
}

test('Platform discovery rejects missing/cross-origin endpoints, unsupported versions, oversized responses, and timeout', async (context) => {
  const sourceProvider = await createTrustedCodeForgeProvider({
    hostAudience: HOST_AUDIENCE,
  });
  const sourceListener = await sourceProvider.listen();
  context.after(() => sourceListener.close());
  const base = sourceProvider.agent.getDiscovery();
  const cases = [
    {
      name: 'missing endpoint',
      document: { ...base, endpoints: { ...base.endpoints, passport: undefined } },
      code: 'DISCOVERY_INVALID',
    },
    {
      name: 'cross origin',
      document: {
        ...base,
        endpoints: { ...base.endpoints, passport: 'https://attacker.example/passport' },
      },
      code: 'DISCOVERY_INVALID',
    },
    {
      name: 'unsupported protocol',
      document: {
        ...base,
        supportedVersions: ['ghostbridge/99'],
        preferredVersion: 'ghostbridge/99',
      },
      code: 'PROTOCOL_UNSUPPORTED',
    },
  ];
  for (const negative of cases) {
    const server = await listenDiscoveryDocument(negative.document);
    context.after(() => server.close());
    await assert.rejects(
      () =>
        fixtureAdapter().discover(
          { baseUrl: server.baseUrl, fixture: true, ...SCOPE },
          platformContext(),
        ),
      (error) => error.code === negative.code,
      negative.name,
    );
  }

  const oversized = await listenDiscoveryDocument(`"${'x'.repeat(8_000)}"`);
  context.after(() => oversized.close());
  await assert.rejects(
    () =>
      fixtureAdapter({ maximumResponseBytes: 1_024 }).discover(
        { baseUrl: oversized.baseUrl, fixture: true, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'RESPONSE_TOO_LARGE',
  );

  const slow = await listenDiscoveryDocument(base, { delayMs: 150 });
  context.after(() => slow.close());
  await assert.rejects(
    () =>
      fixtureAdapter({ timeoutMs: 50 }).discover(
        { baseUrl: slow.baseUrl, fixture: true, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'TIMEOUT',
  );
});

test('production rejects fixture transport and missing principal before network access', async () => {
  const adapter = fixtureAdapter({ environment: 'production' });
  await assert.rejects(
    () =>
      adapter.discover(
        { baseUrl: 'http://127.0.0.1:65530', fixture: true, ...SCOPE },
        platformContext(),
      ),
    (error) => error.code === 'FIXTURE_TRANSPORT_FORBIDDEN',
  );
  await assert.rejects(
    () =>
      fixtureAdapter().discover(
        { baseUrl: 'http://127.0.0.1:65530', fixture: true, ...SCOPE },
        { ...platformContext(), principal: undefined },
      ),
    (error) => error.code === 'AUTHENTICATION_REQUIRED',
  );
});
