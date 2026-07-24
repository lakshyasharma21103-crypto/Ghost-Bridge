'use strict';

const assert = require('node:assert/strict');
const {
  AntiRollbackStore,
  verifyDocument,
} = require('@ghostbridge/trust');
const {
  createIssuerToolkit,
  createLocalTestKeyProvider,
} = require('@ghostbridge/issuer');

async function run() {
  const pass = (value) => process.stdout.write(`PASS ${value}\n`);
  const now = Date.now();
  const clock = () => now;
  const audit = [];
  const provider = createLocalTestKeyProvider({
    clock,
    audit: (event, fields) => audit.push({ event, fields }),
  });
  const toolkit = createIssuerToolkit({
    issuerId: 'http://127.0.0.1:8877',
    displayName: 'Rotation Fixture',
    localTestMode: true,
    allowedLocalIssuers: ['http://127.0.0.1:8877'],
    keyProvider: provider,
    clock,
  });
  const keyA = provider.createKey({ kid: 'rotation_a', purpose: ['passport_signing'] });
  toolkit.prepublishKey(keyA.kid, 1);
  toolkit.activateKey(keyA.kid, 2);
  pass('key generation through provider interface');
  pass('prepublication');
  pass('activation');

  const base = {
    passportId: 'passport_rotation',
    passportVersion: '1',
    agentId: 'rotation-agent',
    issuer: toolkit.issuerId,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 3_600_000).toISOString(),
    status: 'active',
  };
  const version1 = await toolkit.signPassport(base, keyA.kid);
  const keyB = provider.createKey({ kid: 'rotation_b', purpose: ['passport_signing'] });
  toolkit.prepublishKey(keyB.kid, 3);
  toolkit.beginRotation(keyA.kid, keyB.kid, 4);
  assert.equal(provider.getKeyState(keyA.kid), 'retiring');
  assert.equal(provider.getKeyState(keyB.kid), 'active');
  pass('overlap');

  const version2 = await toolkit.signPassport({ ...base, passportVersion: '2' }, keyB.kid);
  assert.equal(
    verifyDocument(version2, toolkit.publishJwks(), {
      purpose: 'passport_signing',
      expectedIssuer: toolkit.issuerId,
      clock,
    }).kid,
    keyB.kid,
  );
  pass('new signing key use');
  assert.equal(
    verifyDocument(version1, toolkit.publishJwks(), {
      purpose: 'passport_signing',
      expectedIssuer: toolkit.issuerId,
      historical: true,
      clock,
    }).kid,
    keyA.kid,
  );
  pass('old-object verification during allowed overlap');

  toolkit.retireKey(keyA.kid, 5);
  assert.equal(provider.getKeyState(keyA.kid), 'retired');
  pass('retirement');
  await assert.rejects(toolkit.signPassport({ ...base, passportVersion: '3' }, keyA.kid));
  pass('no new signatures from retired key');
  assert.throws(() => provider.createKey({ kid: keyA.kid, purpose: ['passport_signing'] }));
  pass('no kid reuse');
  assert.throws(() => provider.assertMaterialUnchanged(keyA.kid, keyB));
  pass('no key-material substitution');

  assert.ok(toolkit.publishJwks().keys.some((key) => key.kid === keyB.kid));
  pass('cache refresh');
  assert.ok(toolkit.metadataSequence >= 5);
  pass('metadata sequence increase');
  const rollback = new AntiRollbackStore();
  rollback.observe('metadata', toolkit.issuerId, toolkit.metadataSequence);
  assert.throws(() => rollback.observe('metadata', toolkit.issuerId, 1));
  pass('metadata rollback rejection');
  assert.ok(audit.some((event) => event.event === 'trust.key.active'));
  pass('audit events');
  pass('Ghost Bridge key rotation verification');
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { run };
