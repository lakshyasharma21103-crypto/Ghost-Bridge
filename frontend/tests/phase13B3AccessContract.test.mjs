import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClientError, apiClient, setPartnerApiKey } from '../src/api/apiClient.js';

function successfulResponse(data = {}) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('protected operator requests fail before fetch when no Partner key is configured', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return successfulResponse();
  };
  setPartnerApiKey('');
  t.after(() => {
    setPartnerApiKey('');
    globalThis.fetch = originalFetch;
  });

  const requests = [
    () => apiClient.get('/operations/summary?receivingWorkspaceId=workspace_test'),
    () => apiClient.get('/invocations?receivingWorkspaceId=workspace_test'),
    () => apiClient.get('/audit-logs?receivingWorkspaceId=workspace_test'),
    () => apiClient.post('/invocations/inv_test/cancel', { version: 1 }),
  ];

  for (const request of requests) {
    await assert.rejects(request, (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.code, 'PARTNER_API_KEY_REQUIRED');
      return true;
    });
  }
  assert.equal(calls.length, 0);
});

test('Phase 13B3 read and control requests carry the configured Partner header', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return successfulResponse();
  };
  setPartnerApiKey('partner_test_key');
  t.after(() => {
    setPartnerApiKey('');
    globalThis.fetch = originalFetch;
  });

  await apiClient.get('/operations/summary?receivingWorkspaceId=workspace_test');
  await apiClient.get('/operations/recovery?receivingWorkspaceId=workspace_test');
  await apiClient.get('/invocations?receivingWorkspaceId=workspace_test');
  await apiClient.get('/invocations/inv_test?receivingWorkspaceId=workspace_test');
  await apiClient.get('/invocations/inv_test/attempts?receivingWorkspaceId=workspace_test');
  await apiClient.get('/audit-logs?receivingWorkspaceId=workspace_test');
  await apiClient.post('/invocations/inv_test/cancel', { version: 1 });
  await apiClient.post('/invocations/inv_test/retry', { version: 1 });
  await apiClient.post('/invocations/inv_test/resolve', {
    version: 1,
    resolution: 'failed',
  });
  await apiClient.post('/operations/recovery/scan', {});

  assert.equal(calls.length, 10);
  for (const call of calls) {
    const headers = new Headers(call.options.headers);
    assert.equal(headers.get('X-Partner-Api-Key'), 'partner_test_key');
    assert.ok(headers.get('X-Request-Id'));
    assert.doesNotMatch(call.url, /partner_test_key/);
  }
});

test('unprotected liveness requests do not receive the Partner header', async (t) => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return successfulResponse();
  };
  setPartnerApiKey('partner_test_key');
  t.after(() => {
    setPartnerApiKey('');
    globalThis.fetch = originalFetch;
  });

  await apiClient.get('/health');

  const headers = new Headers(captured.options.headers);
  assert.equal(headers.get('X-Partner-Api-Key'), null);
});
