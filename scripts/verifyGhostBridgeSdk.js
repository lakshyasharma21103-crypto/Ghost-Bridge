'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PROTOCOL_VERSION,
  negotiateExtensions,
  validateExtensionIdentifier,
} = require('@ghostbridge/protocol-core');
const { createInvoiceAgent } = require('../protocol/examples/invoice-agent/src');
const {
  DeadlineExceededError,
  ScopeMismatchError,
  TaskCancelledError,
  classifyRetry,
  createGhostBridgeClient,
} = require('@ghostbridge/native-client');

const root = path.resolve(__dirname, '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);

async function main() {
  for (const packageName of [
    'ghostbridge-protocol-core',
    'ghostbridge-native-client',
    'ghostbridge-native-agent',
    'ghostbridge-conformance',
    'ghostbridge-inspector',
  ]) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'packages', packageName, 'package.json'), 'utf8'),
    );
    assert.ok(manifest.exports?.['.']);
  }
  pass('SDK package export maps');

  for (const packageName of [
    'ghostbridge-protocol-core',
    'ghostbridge-native-client',
    'ghostbridge-native-agent',
    'ghostbridge-conformance',
    'ghostbridge-inspector',
  ]) {
    const directory = path.join(root, 'packages', packageName);
    const files = walk(directory).filter((file) => /\.(?:js|ts)$/.test(file));
    const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    assert.doesNotMatch(source, /(?:from|require\()\s*['"][^'"]*(?:Backend|frontend\/src|mcp)/i);
  }
  pass('portable package boundaries and no legacy dependency');

  assert.equal(validateExtensionIdentifier('io.ghostbridge/display-metadata'), 'io.ghostbridge/display-metadata');
  const negotiated = negotiateExtensions({
    client: [{ identifier: 'io.ghostbridge/display-metadata', version: '1.0.0', status: 'experimental', required: false }],
    agent: [{ identifier: 'io.ghostbridge/display-metadata', version: '1.0.0', status: 'experimental', required: false }],
  });
  assert.equal(negotiated.negotiated.length, 1);
  assert.equal(
    negotiateExtensions({
      client: [],
      agent: [{ identifier: 'com.example/optional', version: '1.0.0', status: 'experimental', required: false }],
    }).gracefulDegradation,
    true,
  );
  assert.throws(
    () =>
      negotiateExtensions({
        client: [],
        agent: [{ identifier: 'com.example/required', version: '1.0.0', status: 'experimental', required: true }],
      }),
    /could not be negotiated/,
  );
  pass('extension validation, negotiation, conflicts, and graceful degradation');

  const agent = createInvoiceAgent();
  const listener = await agent.listen();
  const client = createGhostBridgeClient({
    baseUrl: listener.baseUrl,
    timeoutMs: 2_000,
    localFixtureMode: true,
    allowedLocalOrigins: [listener.baseUrl],
  });
  try {
    const discovery = await client.discover();
    assert.equal(discovery.preferredVersion, PROTOCOL_VERSION);
    assert.equal((await client.negotiateVersion()).selectedVersion, PROTOCOL_VERSION);
    assert.equal((await client.getPassport()).agentId, 'invoice-agent');
    pass('client discovery, version negotiation, and Passport validation');

    const scope = { organizationScope: 'org_sdk', workspaceScope: 'workspace_sdk' };
    const grant = agent.issueInstallGrant(scope);
    assert.equal((await client.resolveInstallGrant(grant.key, scope)).redemptionState, 'available');
    const installed = await client.install(grant.key, scope);
    assert.equal(installed.status, 'active');
    pass('one-time installation');

    const catalog = await client.searchCapabilities({
      query: 'invoice extract',
      ...scope,
      limit: 5,
    });
    assert.equal(catalog.items[0].capabilityKey, 'invoice.extract');
    assert.equal(Object.hasOwn(catalog.items[0], 'inputContractReference'), false);
    const details = await client.getCapabilityDetails({
      agentId: installed.agentId,
      capabilityKey: 'invoice.extract',
      ...scope,
    });
    assert.equal(details.inputContractReference, 'data:synthetic-invoice@1');
    await assert.rejects(
      () => client.searchCapabilities({ query: 'invoice', organizationScope: 'org_other' }),
      (error) => error instanceof ScopeMismatchError || error.code === 'CONNECTION_NOT_ACTIVE',
    );
    pass('progressive Capability Discovery and scope filtering');

    const invokeOptions = {
      agentId: installed.agentId,
      capability: 'invoice.extract',
      input: {
        invoiceId: 'inv_sdk',
        supplierName: 'Synthetic Supplier',
        currency: 'USD',
        subtotal: 40,
        tax: 2,
      },
      ...scope,
      idempotencyKey: 'sdk-invoice-1',
      deadline: '2099-01-01T00:00:00.000Z',
    };
    const result = await client.invokeAndWait(invokeOptions);
    assert.equal(result.task.state, 'completed');
    assert.equal(result.output.total, 42);
    const receiptVerification = await client.verifyReceipt(result.receipt);
    assert.equal(receiptVerification.valid, false);
    assert.ok(['invalid', 'unverified'].includes(receiptVerification.proofState));
    const replay = await client.invoke(invokeOptions);
    assert.equal(replay.idempotentReplay, true);
    pass('invocation, Task waiting, unverified Receipt handling, and idempotency');

    agent.revokeConnection(installed.connectionId);
    assert.equal(
      (await client.checkRevocation('connection', installed.connectionId)).status,
      'revoked',
    );
    pass('revocation checks');
  } finally {
    client.close();
    await listener.close();
  }

  const abortController = new AbortController();
  abortController.abort();
  const cancelledClient = createGhostBridgeClient({
    baseUrl: 'http://127.0.0.1:9',
    localFixtureMode: true,
    allowedLocalOrigins: ['http://127.0.0.1:9'],
    fetch: async (_url, { signal }) => {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
          once: true,
        }),
      );
    },
  });
  await assert.rejects(
    () =>
      cancelledClient.request('http://127.0.0.1:9/test', {
        signal: abortController.signal,
      }),
    TaskCancelledError,
  );
  pass('AbortSignal cancellation and typed error');

  const timeoutClient = createGhostBridgeClient({
    baseUrl: 'http://127.0.0.1:9',
    localFixtureMode: true,
    allowedLocalOrigins: ['http://127.0.0.1:9'],
    timeoutMs: 50,
    fetch: async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
          once: true,
        }),
      ),
  });
  await assert.rejects(
    () => timeoutClient.request('http://127.0.0.1:9/test'),
    DeadlineExceededError,
  );
  assert.equal(
    classifyRetry(new DeadlineExceededError('DEADLINE_EXCEEDED', 'Timed out.'), {
      method: 'POST',
    }).retryable,
    false,
  );
  pass('bounded timeout and safe retry classification');

  for (const file of [
    'protocol/examples/typescript-sdk/native-agent.ts',
    'protocol/examples/typescript-sdk/native-client.ts',
  ]) assert.ok(fs.existsSync(path.join(root, file)));
  pass('actual TypeScript SDK examples present');

  process.stdout.write('PASS Ghost Bridge SDK verification\n');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
