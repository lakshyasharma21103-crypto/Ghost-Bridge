'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  InspectorSecurityError,
  assertInspectorTarget,
  sanitizeInspectorValue,
} = require('../src');
const fs = require('node:fs');
const path = require('node:path');

test('Inspector accepts loopback and rejects remote targets by default', () => {
  assert.equal(assertInspectorTarget('http://127.0.0.1:8787').loopback, true);
  assert.throws(
    () => assertInspectorTarget('https://agents.example.test'),
    InspectorSecurityError,
  );
  assert.throws(
    () =>
      assertInspectorTarget('https://agents.example.test', {
        allowUnsafeRemote: true,
      }),
    /acknowledgement/,
  );
  assert.equal(
    assertInspectorTarget('https://agents.example.test', {
      allowUnsafeRemote: true,
      unsafeAcknowledged: true,
    }).loopback,
    false,
  );
});

test('Inspector sanitization removes credential material recursively', () => {
  const value = sanitizeInspectorValue({
    authorization: 'Bearer private',
    nested: { cookie: 'session=private', safe: 'visible' },
  });
  assert.equal(value.authorization, '[REDACTED]');
  assert.equal(value.nested.cookie, '[REDACTED]');
  assert.equal(value.nested.safe, 'visible');
  assert.doesNotMatch(JSON.stringify(value), /Bearer private|session=private/);
});

test('Inspector presents host-agent workflows before experimental coordination', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
  const profiles = source.indexOf("'Profiles'");
  const installPreview = source.indexOf("'Install Preview'");
  const experimental = source.indexOf("'Experimental: Agent Coordination'");
  assert.ok(profiles > -1 && installPreview > profiles);
  assert.ok(experimental > installPreview);
  assert.doesNotMatch(source.slice(source.indexOf('<main><nav'), experimental), /'Delegation'/);
});
