import http from 'node:http';

const protocolVersion = 'ghostbridge/0.1-draft';
const server = http.createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const routes = {
    '/.well-known/ghostbridge': {
      protocol: 'ghostbridge',
      supportedVersions: [protocolVersion],
      preferredVersion: protocolVersion,
      status: 'experimental',
      features: {
        tasks: true,
        approvals: false,
        delegation: false,
        receipts: true,
        revocation: true,
      },
      profiles: {
        core: {
          id: 'ghostbridge.core',
          supported: true,
          status: 'draft',
          conformance: ['C1'],
        },
      },
      transports: ['http-json'],
      maximumMessageBytes: 65536,
      endpoints: {
        passport: `${origin}/ghostbridge/passport`,
        capabilities: `${origin}/ghostbridge/capabilities`,
      },
      extensionNamespaces: [],
    },
    '/ghostbridge/passport': {
      protocolVersion,
      passportId: 'passport_black_box',
      passportVersion: '1',
      agentId: 'agent_black_box',
      displayName: 'Raw Black Box Agent',
      safeDescription: 'A serialized-process conformance fixture.',
      issuer: 'fixture:black-box',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['fixture.echo'],
      supportedProtocolVersions: [protocolVersion],
      supportedTransports: ['http-json'],
      dataDeclarations: [],
      delegationDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: 'revocations/passport_black_box',
    },
    '/ghostbridge/capabilities': {
      items: [{ capabilityKey: 'fixture.echo', capabilityVersion: '1', status: 'active' }],
    },
    '/negative/malformed-discovery': { protocol: 'not-ghostbridge' },
    '/negative/wrong-audience': {
      audience: 'another-host',
      errorCode: 'AUDIENCE_MISMATCH',
    },
  };
  if (!Object.hasOwn(routes, request.url)) {
    response.statusCode = 404;
    response.end(JSON.stringify({ errorCode: 'INVALID_MESSAGE' }));
    return;
  }
  response.end(JSON.stringify(routes[request.url]));
});

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({ port: server.address().port })}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
