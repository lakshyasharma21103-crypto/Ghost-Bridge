'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  GhostBridgeInspector,
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

test('Inspector reads canonical Stage A and Native Agent profile objects', async () => {
  const inspector = new GhostBridgeInspector({ baseUrl: 'http://127.0.0.1:8787' });
  inspector.client = {
    discover: async () => ({
      profiles: {
        core: { supported: true, status: 'draft', conformance: [] },
        governedExecution: { supported: true, status: 'draft', conformance: [] },
      },
    }),
  };
  const stageA = await inspector.inspectProfiles();
  assert.equal(stageA.core.supported, true);
  assert.equal(stageA.governedExecution.supported, true);
  assert.equal(stageA.agentCoordination, null);

  inspector.client.discover = async () => ({
    profiles: {
      core: { supported: true, status: 'draft', conformance: ['C1'] },
    },
  });
  const nativeAgent = await inspector.inspectProfiles();
  assert.deepEqual(nativeAgent.core.conformance, ['C1']);
  assert.equal(nativeAgent.governedExecution, null);
  assert.equal(nativeAgent.agentCoordination, null);
});

test('Inspector rejects malformed profile objects without array lookup failures', async () => {
  const inspector = new GhostBridgeInspector({ baseUrl: 'http://127.0.0.1:8787' });
  for (const profiles of [
    [],
    { core: { supported: 'yes' } },
    { unknownProfile: { supported: true } },
  ]) {
    inspector.client = { discover: async () => ({ profiles }) };
    await assert.rejects(
      () => inspector.inspectProfiles(),
      (error) => {
        assert.doesNotMatch(String(error?.message), /\.find is not a function/);
        return true;
      },
    );
  }
});
