const assert = require('node:assert/strict');
const test = require('node:test');
const Partner = require('../models/Partner');
const Workspace = require('../models/Workspace');
const { createApp } = require('../app');
const { env } = require('../config/env');
const {
  DEVELOPMENT_FIXTURE_HEADER,
  fixturePrincipal,
} = require('../middleware/authenticateHostPrincipal');
const { hashPartnerApiKey } = require('../utils/crypto');

const RAW_KEY = 'agentpass_partner_phase15c1a_authentication_fixture';
const COOKIE_SECRET = 'phase15c1a-cookie-must-not-leak';

function patchIdentityModels() {
  const originalPartnerFindOne = Partner.findOne;
  const originalWorkspaceFind = Workspace.find;
  Partner.findOne = () => ({
    select: () => ({
      lean: async () => ({
        _id: 'partner_phase15c1a',
        name: 'Phase 15C.1A Host',
        slug: 'phase-15c1a-host',
        status: 'active',
        apiKeyHash: hashPartnerApiKey(RAW_KEY),
      }),
    }),
  });
  Workspace.find = () => ({
    select: () => ({
      lean: async () => [
        {
          externalWorkspaceId: 'workspace_allowed',
          organizationId: 'organization_allowed',
        },
      ],
    }),
  });
  return () => {
    Partner.findOne = originalPartnerFindOne;
    Workspace.find = originalWorkspaceFind;
  };
}

async function withServer(operation, options = {}) {
  const restoreModels = patchIdentityModels();
  const originalFixtureFlag = env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES;
  env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES = options.fixtureEnabled === true;
  const app = createApp();
  let resolvedInput;
  app.locals.resolveInstallKey = async (input) => {
    resolvedInput = input;
    return {
      status: 'connected',
      connectionId: 'connection_phase15c1a',
      agent: { name: 'Phase 15C.1A fixture' },
    };
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    return await operation({
      origin: `http://127.0.0.1:${address.port}`,
      resolvedInput: () => resolvedInput,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES = originalFixtureFlag;
    restoreModels();
  }
}

async function installRequest(origin, body, options = {}) {
  return fetch(`${origin}/api/v1/passports/resolve`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.auth === false ? {} : { 'X-Partner-Api-Key': RAW_KEY }),
      ...(options.fixture ? { [DEVELOPMENT_FIXTURE_HEADER]: '1' } : {}),
      ...(options.cookie ? { cookie: `session=${COOKIE_SECRET}` } : {}),
    },
    body: JSON.stringify({ key: 'agentpass_install_phase15c1a_fixture_value', ...body }),
  });
}

test('authenticated Host principal may install into a permitted workspace', async () => {
  await withServer(async ({ origin, resolvedInput }) => {
    const response = await installRequest(origin, {
      key: 'gb-install-platform-r1',
      receivingWorkspaceId: 'workspace_allowed',
      receivingOrganizationId: 'organization_allowed',
    });
    assert.equal(response.status, 200);
    assert.equal(resolvedInput().receivingUserId, 'partner:partner_phase15c1a');
    assert.equal(resolvedInput().receivingWorkspaceId, 'workspace_allowed');
    assert.equal(resolvedInput().receivingOrganizationId, 'organization_allowed');
    assert.deepEqual(Object.keys(resolvedInput()).sort(), [
      'key',
      'receivingOrganizationId',
      'receivingUserId',
      'receivingWorkspaceId',
    ]);
  });
});

test('missing principal fails before installation mutation', async () => {
  await withServer(async ({ origin, resolvedInput }) => {
    const response = await installRequest(
      origin,
      { receivingWorkspaceId: 'workspace_allowed' },
      { auth: false },
    );
    assert.equal(response.status, 401);
    assert.equal(resolvedInput(), undefined);
  });
});

test('body user mismatch is rejected', async () => {
  await withServer(async ({ origin }) => {
    const response = await installRequest(origin, {
      receivingWorkspaceId: 'workspace_allowed',
      receivingUserId: 'spoofed-user',
    });
    assert.equal(response.status, 403);
  });
});

test('body organization mismatch is rejected', async () => {
  await withServer(async ({ origin }) => {
    const response = await installRequest(origin, {
      receivingWorkspaceId: 'workspace_allowed',
      organizationId: 'organization_other',
    });
    assert.equal(response.status, 403);
  });
});

test('body workspace mismatch is rejected', async () => {
  await withServer(async ({ origin }) => {
    const response = await installRequest(origin, {
      receivingWorkspaceId: 'workspace_other',
    });
    assert.equal(response.status, 403);
  });
});

test('workspace absent from principal permissions is rejected before mutation', async () => {
  await withServer(async ({ origin, resolvedInput }) => {
    const response = await installRequest(origin, {
      receivingWorkspaceId: 'workspace_unbound',
    });
    assert.equal(response.status, 403);
    assert.equal(resolvedInput(), undefined);
  });
});

test('development identity fixture is unavailable by default', async () => {
  await withServer(async ({ origin }) => {
    const response = await installRequest(
      origin,
      {
        receivingUserId: 'fixture-user',
        receivingWorkspaceId: 'fixture-workspace',
        organizationId: 'fixture-organization',
      },
      { auth: false, fixture: true },
    );
    assert.equal(response.status, 401);
  });
});

test('development identity fixture works only when flag and request opt-in are explicit', async () => {
  await withServer(async ({ origin, resolvedInput }) => {
    const response = await installRequest(
      origin,
      {
        receivingUserId: 'fixture-user',
        receivingWorkspaceId: 'fixture-workspace',
        organizationId: 'fixture-organization',
      },
      { auth: false, fixture: true },
    );
    assert.equal(response.status, 200);
    assert.equal(resolvedInput().receivingUserId, 'fixture-user');
  }, { fixtureEnabled: true });
});

test('development identity fixture remains prohibited outside development', () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalFlag = env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES;
  env.NODE_ENV = 'production';
  env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES = true;
  try {
    assert.equal(
      fixturePrincipal({
        header: () => '1',
        body: {
          receivingUserId: 'fixture-user',
          receivingWorkspaceId: 'fixture-workspace',
          organizationId: 'fixture-organization',
        },
      }),
      undefined,
    );
  } finally {
    env.NODE_ENV = originalNodeEnv;
    env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES = originalFlag;
  }
});

test('authentication errors never expose raw API keys or cookies', async () => {
  await withServer(async ({ origin }) => {
    const response = await fetch(`${origin}/api/v1/passports/resolve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Partner-Api-Key': `${RAW_KEY}-invalid`,
        cookie: `session=${COOKIE_SECRET}`,
      },
      body: JSON.stringify({ receivingWorkspaceId: 'workspace_allowed' }),
    });
    const text = await response.text();
    assert.equal(response.status, 401);
    assert.doesNotMatch(text, new RegExp(RAW_KEY));
    assert.doesNotMatch(text, new RegExp(COOKIE_SECRET));
  });
});
