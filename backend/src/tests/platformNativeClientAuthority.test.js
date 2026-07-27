'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { env } = require('../config/env');
const {
  LEGACY_PROTOCOL_FIXTURE_HEADER,
  requireLegacyProtocolFixture,
} = require('../middleware/requireLegacyProtocolFixture');
const {
  MongoReplayStore,
  authenticatedScope,
  createPlatformNativeClientAdapter,
} = require('../services/platformNativeClient.service');
const { invoke } = require('../services/runtimeGateway.service');

const principal = Object.freeze({
  userId: 'user_authoritative',
  organizationId: 'organization_authoritative',
  permittedOrganizationIds: ['organization_authoritative'],
  permittedWorkspaceIds: ['workspace_authoritative'],
  workspaceOrganizationIds: {
    workspace_authoritative: 'organization_authoritative',
  },
  authenticationMethod: 'test',
});

test('Platform Native Client scope treats request identifiers only as confirmations', () => {
  assert.deepEqual(
    authenticatedScope(principal, {
      receivingUserId: 'user_authoritative',
      receivingOrganizationId: 'organization_authoritative',
      receivingWorkspaceId: 'workspace_authoritative',
    }),
    {
      organizationScope: 'organization_authoritative',
      workspaceScope: 'workspace_authoritative',
      userId: 'user_authoritative',
      subjectId: 'user_authoritative',
      authenticationMethod: 'test',
    },
  );
  for (const input of [
    {
      receivingUserId: 'spoofed_user',
      receivingWorkspaceId: 'workspace_authoritative',
    },
    {
      receivingOrganizationId: 'organization_other',
      receivingWorkspaceId: 'workspace_authoritative',
    },
    {
      receivingWorkspaceId: 'workspace_other',
    },
  ]) {
    assert.throws(
      () => authenticatedScope(principal, input),
      (error) => error.code === 'AUTHORIZATION_DENIED',
    );
  }
  assert.throws(
    () =>
      authenticatedScope(undefined, {
        receivingWorkspaceId: 'workspace_authoritative',
      }),
    (error) => error.code === 'AUTHENTICATION_REQUIRED',
  );
});

function runLegacyGuard(headerValue) {
  return new Promise((resolve) => {
    requireLegacyProtocolFixture(
      { get: (name) => (name === LEGACY_PROTOCOL_FIXTURE_HEADER ? headerValue : undefined) },
      {},
      (error) => resolve(error),
    );
  });
}

test('legacy protocol routes require explicit development fixture eligibility', async () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalFlag = env.ALLOW_LEGACY_PROTOCOL_FIXTURES;
  try {
    env.NODE_ENV = 'development';
    env.ALLOW_LEGACY_PROTOCOL_FIXTURES = false;
    assert.equal((await runLegacyGuard('1')).code, 'PLATFORM_NATIVE_CLIENT_REQUIRED');
    env.ALLOW_LEGACY_PROTOCOL_FIXTURES = true;
    assert.equal(await runLegacyGuard(undefined) instanceof Error, true);
    assert.equal(await runLegacyGuard('1'), undefined);
    env.NODE_ENV = 'production';
    assert.equal((await runLegacyGuard('1')).code, 'PLATFORM_NATIVE_CLIENT_REQUIRED');
  } finally {
    env.NODE_ENV = originalNodeEnv;
    env.ALLOW_LEGACY_PROTOCOL_FIXTURES = originalFlag;
  }
});

test('production runtime gateway cannot invoke a direct REST/MCP adapter', async () => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  try {
    await assert.rejects(
      () => invoke('legacy_connection', 'legacy.capability', {}, {}),
      (error) => error.code === 'PLATFORM_NATIVE_CLIENT_REQUIRED',
    );
  } finally {
    env.NODE_ENV = originalNodeEnv;
  }
});

test('production Native Client negotiation never offers unauthenticated Agent access', async () => {
  let clientOptions;
  const adapter = createPlatformNativeClientAdapter({
    environment: 'production',
    bindingSecret: 'phase-15c2-production-auth-mode-test-secret',
    trustProvider: () => ({ required: true }),
    transportFactory: () => ({ request: async () => ({}) }),
    clientFactory(options) {
      clientOptions = options;
      return {
        async discover() {
          const error = new Error('stop after construction');
          error.code = 'PROVIDER_UNAVAILABLE';
          throw error;
        },
      };
    },
  });
  await assert.rejects(
    () =>
      adapter.discover(
        {
          baseUrl: 'https://agent.example',
          organizationScope: 'organization_authoritative',
          workspaceScope: 'workspace_authoritative',
        },
        { principal },
      ),
    (error) => error.code === 'TRANSPORT_UNAVAILABLE',
  );
  assert.deepEqual(clientOptions.supportedAuthenticationModes, ['signed_request', 'oauth']);
  assert.equal(clientOptions.supportedAuthenticationModes.includes('none'), false);
});

test('production Approval replay authority stores only a digest and fails duplicate use closed', async () => {
  const writes = [];
  const store = new MongoReplayStore({
    async create(value) {
      writes.push(value);
      if (writes.length > 1) {
        const error = new Error('duplicate');
        error.code = 11000;
        throw error;
      }
    },
  });
  const key = 'decision_sensitive_reference:approval_action_digest';
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await store.consume(key, expiresAt);
  assert.match(writes[0]._id, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(writes[0]), /decision_sensitive_reference/);
  await assert.rejects(
    () => store.consume(key, expiresAt),
    (error) => error.code === 'APPROVAL_INVALID',
  );
});
