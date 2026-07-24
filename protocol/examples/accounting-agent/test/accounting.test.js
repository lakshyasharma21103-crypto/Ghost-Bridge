'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createAccountingAgent } = require('../src');

test('accounting reference agent exposes delegated governed capabilities', () => {
  const agent = createAccountingAgent();
  assert.deepEqual(
    agent.listCapabilities().map((item) => item.capabilityKey),
    ['accounting.check_duplicate', 'accounting.create_draft'],
  );
  assert.equal(
    agent.listCapabilities().find((item) => item.capabilityKey === 'accounting.create_draft')
      .approvalRequirement,
    'required',
  );
});
