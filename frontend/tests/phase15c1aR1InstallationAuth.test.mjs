import assert from 'node:assert/strict';
import test from 'node:test';

import {
  API_BASE_URL,
  apiClient,
  setPartnerApiKey,
} from '../src/api/apiClient.js';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  setPartnerApiKey('');
  globalThis.fetch = originalFetch;
});

test('/passports/resolve requires a configured Partner API key before transport', async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('Transport must not be reached without authentication.');
  };
  await assert.rejects(
    () =>
      apiClient.post('/passports/resolve', {
        key: 'gb-install-safe-fixture',
        receivingWorkspaceId: 'workspace_r1',
        receivingOrganizationId: 'organization_r1',
      }),
    (error) =>
      error.code === 'PARTNER_API_KEY_REQUIRED' &&
      !String(error.message).includes('gb-install-safe-fixture'),
  );
  assert.equal(fetchCalled, false);
});

test('authenticated installation attaches only the bounded Partner header and submitted scope', async () => {
  const partnerKey = 'partner-secret-r1';
  const installKey = 'gb-install-r1';
  let observed;
  setPartnerApiKey(partnerKey);
  globalThis.fetch = async (url, options) => {
    observed = { url: String(url), options };
    return new Response(
      JSON.stringify({
        success: true,
        data: { connectionId: 'connection_r1', status: 'connected' },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  };

  await apiClient.post('/passports/resolve', {
    key: installKey,
    receivingWorkspaceId: 'workspace_r1',
    receivingOrganizationId: 'organization_r1',
  });

  assert.equal(observed.url, `${API_BASE_URL}/passports/resolve`);
  assert.equal(new URL(observed.url).search, '');
  assert.equal(observed.options.headers.get('X-Partner-Api-Key'), partnerKey);
  const body = JSON.parse(observed.options.body);
  assert.deepEqual(body, {
    key: installKey,
    receivingWorkspaceId: 'workspace_r1',
    receivingOrganizationId: 'organization_r1',
  });
  assert.equal(Object.hasOwn(body, 'receivingUserId'), false);
  assert.equal(JSON.stringify(body).includes(partnerKey), false);
  assert.equal(observed.url.includes(partnerKey), false);
});

test('configured installation request reaches the HTTP authentication boundary safely', async () => {
  setPartnerApiKey('partner-key-r1');
  let reached = false;
  globalThis.fetch = async (_url, options) => {
    reached = options.headers.get('X-Partner-Api-Key') === 'partner-key-r1';
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authenticated Host principal is required for installation.',
        },
      }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      },
    );
  };
  await assert.rejects(
    () =>
      apiClient.post('/passports/resolve', {
        key: 'gb-install-r1',
        receivingWorkspaceId: 'workspace_r1',
        receivingOrganizationId: 'organization_r1',
      }),
    (error) =>
      error.code === 'AUTHENTICATION_REQUIRED' &&
      !JSON.stringify(error).includes('partner-key-r1'),
  );
  assert.equal(reached, true);
});
