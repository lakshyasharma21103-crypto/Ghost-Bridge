'use strict';

const assert = require('node:assert/strict');
const { createGhostBridgeClient } = require('@ghostbridge/native-client');
const { createInvoiceAgent } = require('../protocol/examples/invoice-agent/src');

async function main() {
  const agent = createInvoiceAgent();
  const listener = await agent.listen();
  const client = createGhostBridgeClient({
    baseUrl: listener.baseUrl,
    localFixtureMode: true,
    allowedLocalOrigins: [listener.baseUrl],
  });
  try {
    const discovery = await client.discover();
    assert.equal(discovery.features.delegation, false);
    assert.equal(Object.hasOwn(discovery.profiles, 'agentCoordination'), false);
    assert.equal(typeof agent.registerDelegation, 'undefined');
    process.stdout.write('PASS Agent Coordination is isolated from the Native Agent surface\n');
  } finally {
    client.close();
    await listener.close();
  }
}

main().catch((error) => {
  process.stderr.write(`FAIL ${error.safeMessage || error.message}\n`);
  process.exitCode = 1;
});
