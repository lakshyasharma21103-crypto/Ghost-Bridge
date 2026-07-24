'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { assertLocalFixture, COMMANDS } = require('../src');

test('conformance exposes deterministic Level 1-3 commands', () => {
  assert.equal(COMMANDS.includes('verify-level-1'), true);
  assert.equal(COMMANDS.includes('verify-level-2'), true);
  assert.equal(COMMANDS.includes('verify-level-3'), true);
});

test('conformance exposes Core and Governed levels without requiring coordination', () => {
  const { CONFORMANCE_PROFILES } = require('../src');
  for (const command of [
    'verify-core-c1', 'verify-core-c2', 'verify-core-c3', 'verify-core',
    'verify-governed-g1', 'verify-governed-g2', 'verify-governed-g3', 'verify-governed',
  ]) {
    assert.equal(COMMANDS.includes(command), true);
  }
  assert.deepEqual(Object.keys(CONFORMANCE_PROFILES.Core.levels), ['C1', 'C2', 'C3']);
  assert.deepEqual(Object.keys(CONFORMANCE_PROFILES['Governed Execution'].levels), ['G1', 'G2', 'G3']);
  assert.doesNotMatch(JSON.stringify(CONFORMANCE_PROFILES.Core), /delegation/i);
  assert.equal(CONFORMANCE_PROFILES['Agent Coordination'].status, 'Experimental/Deferred');
});

test('conformance runner refuses non-local targets', () => {
  assert.doesNotThrow(() => assertLocalFixture('http://127.0.0.1:8787'));
  assert.throws(() => assertLocalFixture('https://example.com'));
});
