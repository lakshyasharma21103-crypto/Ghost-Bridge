'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const {
  createNodeSecurityTransport,
  isPublicAddress,
  resolveAndPin,
  validateTransportUrl,
} = require('../src/nodeTransport');

async function expectCode(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

function fixtureServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

test('network classification rejects private, metadata, carrier-grade, documentation, and reserved IPs', () => {
  for (const address of [
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '192.0.2.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '240.0.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff00::1',
    '2001:db8::1',
    '::ffff:10.0.0.1',
    '::ffff:169.254.169.254',
    '::ffff:172.16.0.1',
    '::ffff:100.64.0.1',
    '::ffff:127.0.0.1',
    '::ffff:192.168.1.1',
    '::ffff:a9fe:a9fe',
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('DNS resolution rejects private IPv4, private IPv6, and mixed answers', async () => {
  await expectCode(
    () =>
      resolveAndPin(new URL('https://issuer.example/path'), {
        lookup: async () => [{ address: '10.0.0.2', family: 4 }],
      }),
    'UNSAFE_DISCOVERY_TARGET',
  );
  await expectCode(
    () =>
      resolveAndPin(new URL('https://issuer.example/path'), {
        lookup: async () => [{ address: 'fd00::2', family: 6 }],
      }),
    'UNSAFE_DISCOVERY_TARGET',
  );
  await expectCode(
    () =>
      resolveAndPin(new URL('https://issuer.example/path'), {
        lookup: async () => [
          { address: '8.8.8.8', family: 4 },
          { address: '127.0.0.1', family: 4 },
        ],
      }),
    'UNSAFE_DISCOVERY_TARGET',
  );
});

test('validation pins a single DNS answer and never performs a second resolver call', async () => {
  let calls = 0;
  const pinned = await resolveAndPin(new URL('https://issuer.example/path'), {
    lookup: async () => {
      calls += 1;
      return calls === 1
        ? [{ address: '8.8.8.8', family: 4 }]
        : [{ address: '127.0.0.1', family: 4 }];
    },
  });
  assert.deepEqual(pinned, { address: '8.8.8.8', family: 4 });
  assert.equal(calls, 1);
});

test('URL policy rejects unsafe ports, credentials, queries, and fragments', () => {
  for (const value of [
    'https://issuer.example:8443/metadata',
    'https://user:password@issuer.example/metadata',
    'https://issuer.example/metadata?target=x',
    'https://issuer.example/metadata#fragment',
  ]) {
    assert.throws(() => validateTransportUrl(value), { code: 'UNSAFE_DISCOVERY_TARGET' });
  }
});

test('explicit local fixture allowlist permits only its exact loopback origin', async () => {
  const fixture = await fixtureServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{}');
  });
  try {
    const transport = createNodeSecurityTransport();
    const response = await transport.get(`${fixture.origin}/metadata`, {
      localFixtureMode: true,
      allowedLocalOrigins: [fixture.origin],
      timeoutMs: 1_000,
    });
    assert.equal(response.status, 200);
    await expectCode(
      () =>
        transport.get(`${fixture.origin}/metadata`, {
          localFixtureMode: true,
          allowedLocalOrigins: ['http://127.0.0.1:1'],
        }),
      'UNSAFE_DISCOVERY_TARGET',
    );
  } finally {
    await fixture.close();
  }
});

test('transport rejects same-origin and cross-origin redirects', async () => {
  const fixture = await fixtureServer((request, response) => {
    response.statusCode = 302;
    response.setHeader(
      'location',
      request.url === '/same' ? '/private' : 'http://127.0.0.1:1/private',
    );
    response.end();
  });
  try {
    const transport = createNodeSecurityTransport();
    for (const path of ['/same', '/cross']) {
      await expectCode(
        () =>
          transport.get(`${fixture.origin}${path}`, {
            localFixtureMode: true,
            allowedLocalOrigins: [fixture.origin],
          }),
        'ISSUER_DISCOVERY_FAILED',
      );
    }
  } finally {
    await fixture.close();
  }
});

test('transport rejects oversized declared and streamed bodies', async () => {
  const fixture = await fixtureServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/declared') response.setHeader('content-length', '1000');
    response.end('x'.repeat(100));
  });
  try {
    const transport = createNodeSecurityTransport();
    for (const path of ['/declared', '/streamed']) {
      await expectCode(
        () =>
          transport.get(`${fixture.origin}${path}`, {
            localFixtureMode: true,
            allowedLocalOrigins: [fixture.origin],
            maximumBytes: 50,
          }),
        'RESPONSE_TOO_LARGE',
      );
    }
  } finally {
    await fixture.close();
  }
});

test('transport validates content type', async () => {
  const fixture = await fixtureServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end('{}');
  });
  try {
    await expectCode(
      () =>
        createNodeSecurityTransport().get(`${fixture.origin}/metadata`, {
          localFixtureMode: true,
          allowedLocalOrigins: [fixture.origin],
        }),
      'ISSUER_DISCOVERY_FAILED',
    );
  } finally {
    await fixture.close();
  }
});

test('hard deadline fires with and without a caller signal', async () => {
  const fixture = await fixtureServer(() => {});
  try {
    for (const signal of [undefined, new AbortController().signal]) {
      await expectCode(
        () =>
          createNodeSecurityTransport().get(`${fixture.origin}/metadata`, {
            localFixtureMode: true,
            allowedLocalOrigins: [fixture.origin],
            timeoutMs: 50,
            signal,
          }),
        'ISSUER_DISCOVERY_FAILED',
      );
    }
  } finally {
    await fixture.close();
  }
});

test('caller cancellation aborts the pinned request', async () => {
  const fixture = await fixtureServer(() => {});
  const controller = new AbortController();
  try {
    const pending = createNodeSecurityTransport().get(`${fixture.origin}/metadata`, {
      localFixtureMode: true,
      allowedLocalOrigins: [fixture.origin],
      timeoutMs: 1_000,
      signal: controller.signal,
    });
    controller.abort();
    await expectCode(() => pending, 'ISSUER_DISCOVERY_FAILED');
  } finally {
    await fixture.close();
  }
});
