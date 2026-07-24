'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createCodeForgeProvider } = require('../src');

test('provider publishes a conforming installable external agent', () => {
  const provider = createCodeForgeProvider();
  const discovery = provider.agent.getDiscovery();
  assert.equal(discovery.profiles.core.supported, true);
  assert.equal(discovery.profiles.governedExecution.supported, true);
  assert.equal(discovery.profiles.agentCoordination.status, 'deferred');
  assert.equal(provider.agent.listCapabilities()[0].capabilityKey, 'codeforge.create_app');
});
