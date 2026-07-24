'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createInvoiceAgent } = require('../src');

test('invoice reference agent exposes one native capability', () => {
  const agent = createInvoiceAgent();
  assert.deepEqual(agent.getPassport().capabilities, ['invoice.extract']);
  assert.equal(agent.listCapabilities()[0].capabilityKey, 'invoice.extract');
});
