'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createCodeForgeProvider } = require('../src');

test('provider publishes a conforming installable external agent', async () => {
  const provider = createCodeForgeProvider();
  const listener = await provider.listen();
  try {
    const discovery = provider.agent.getDiscovery();
    assert.equal(discovery.profiles.core.supported, true);
    assert.equal(discovery.profiles.governedExecution.supported, true);
    assert.equal(Object.hasOwn(discovery.profiles, 'agentCoordination'), false);
    assert.equal(discovery.features.delegation, false);
    assert.equal(provider.agent.listCapabilities()[0].capabilityKey, 'codeforge.create_app');
  } finally {
    await listener.close();
  }
});
