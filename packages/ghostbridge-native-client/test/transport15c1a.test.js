'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DEFAULT_LIMITS,
  PROTOCOL_VERSION,
} = require('@ghostbridge/protocol-core');
const {
  createGhostBridgeClient,
} = require('../src');

function discoveryResponse(body, options = {}) {
  const bytes = new TextEncoder().encode(body);
  return {
    status: options.status || 200,
    ok: options.status ? options.status >= 200 && options.status < 300 : true,
    headers: new Headers({
      'content-type': options.contentType || 'application/json',
      ...(options.contentLength
        ? { 'content-length': String(options.contentLength) }
        : {}),
    }),
    body: options.body || new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
      cancel() {
        options.onCancel?.();
      },
    }),
  };
}

test('Native Client declares Node pinning and rejects insecure trust-required Fetch', () => {
  const nodeClient = createGhostBridgeClient({ baseUrl: 'https://agent.example' });
  assert.equal(nodeClient.transport.securityProperties.dnsRebindingResistant, true);
  assert.equal(nodeClient.transport.securityProperties.addressPinning, true);

  assert.throws(
    () =>
      createGhostBridgeClient({
        baseUrl: 'https://agent.example',
        fetch: async () => discoveryResponse('{}'),
        trust: { required: true },
      }),
    /DNS-pinned security transport/,
  );
  assert.throws(
    () =>
      createGhostBridgeClient({
        baseUrl: 'https://agent.example',
        transport: { request() {} },
      }),
    /declared securityProperties/,
  );
});

test('Fetch transport enforces declared and streamed response bounds before parsing', async () => {
  let declaredCancelled = false;
  const declared = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async () =>
      discoveryResponse('{}', {
        contentLength: DEFAULT_LIMITS.maximumMessageBytes + 1,
        onCancel: () => {
          declaredCancelled = true;
        },
      }),
  });
  await assert.rejects(
    () => declared.discover(),
    (error) => error.code === 'MESSAGE_TOO_LARGE',
  );
  assert.equal(declaredCancelled, true);

  let streamedCancelled = false;
  const streamedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(DEFAULT_LIMITS.maximumMessageBytes));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() {
      streamedCancelled = true;
    },
  });
  const streamed = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async () => discoveryResponse('{}', { body: streamedBody }),
  });
  await assert.rejects(
    () => streamed.discover(),
    (error) => error.code === 'MESSAGE_TOO_LARGE',
  );
  assert.equal(streamedCancelled, true);
});

test('Fetch transport rejects redirect, wrong media type, and caller cancellation', async () => {
  const redirect = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async () => discoveryResponse('', { status: 302 }),
  });
  await assert.rejects(() => redirect.discover());

  const wrongType = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async () => discoveryResponse('{}', { contentType: 'text/html' }),
  });
  await assert.rejects(() => wrongType.discover());

  const controller = new AbortController();
  const cancelled = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  });
  const pending = cancelled.request('https://agent.example/private', {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(
    () => pending,
    (error) => error.code === 'TASK_CANCELLED',
  );
});

test('resolver and endpoint templates cannot introduce unsafe authority', async () => {
  const unsafeResolver = createGhostBridgeClient({
    installGrantResolver: async () => 'http://169.254.169.254/latest',
    serverMode: false,
    fetch: async () => discoveryResponse('{}'),
  });
  await assert.rejects(
    () =>
      unsafeResolver.previewInstall({
        grant: 'opaque-install-grant',
        organizationScope: 'org_test',
      }),
    /requires HTTPS/,
  );

  const malformedTemplateDiscovery = {
    protocol: 'ghostbridge',
    supportedVersions: [PROTOCOL_VERSION],
    preferredVersion: PROTOCOL_VERSION,
    status: 'experimental',
    features: {},
    transports: ['https-json'],
    maximumMessageBytes: 1000,
    endpoints: {
      passport: '/passport',
      capabilities: '/capabilities',
      capabilityDetails: 'https://{capabilityKey}@evil.example/private',
    },
    profiles: {
      core: { supported: true, status: 'draft', conformance: [] },
    },
    extensionNamespaces: [],
  };
  const client = createGhostBridgeClient({
    baseUrl: 'https://agent.example',
    serverMode: false,
    fetch: async () => discoveryResponse(JSON.stringify(malformedTemplateDiscovery)),
  });
  await client.discover();
  await assert.rejects(
    () =>
      client.getCapabilityDetails({
        capabilityKey: 'fixture.echo',
        organizationScope: 'org_test',
      }),
    /endpoint template/,
  );
});
