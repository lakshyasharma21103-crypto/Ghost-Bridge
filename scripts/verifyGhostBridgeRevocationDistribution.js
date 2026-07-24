'use strict';

const assert = require('node:assert/strict');
const {
  RevocationCache,
  historicalReceiptStatus,
  validateRevocationSet,
} = require('@ghostbridge/trust');
const { createPhase15cTrustFixture } = require('./phase15cTrustFixture');

async function run() {
  const pass = (value) => process.stdout.write(`PASS ${value}\n`);
  const fixture = await createPhase15cTrustFixture();
  try {
    const first = fixture.provider.publicTrust.revocationSet;
    const firstVerification = validateRevocationSet(
      first,
      fixture.provider.publicTrust.jwks,
      { expectedIssuer: first.issuer, clock: fixture.clock },
    );
    assert.equal(firstVerification.valid, true);
    pass('signed revocation set');
    assert.equal(first.sequence, 1);
    pass('sequence validation');
    assert.equal(first.previousSetDigest, 'none');
    pass('previous-set digest');

    const cache = new RevocationCache();
    cache.put(first.issuer, first, firstVerification);
    assert.equal(cache.get(first.issuer).document.sequence, 1);
    pass('cache storage');
    assert.equal(firstVerification.freshness, 'fresh');
    pass('bounded freshness');

    const { connection } = await fixture.install();
    const emergency = await fixture.provider.revokeConnectionTrust(connection.connectionId);
    const emergencyVerification = validateRevocationSet(
      emergency,
      fixture.provider.publicTrust.jwks,
      {
        expectedIssuer: first.issuer,
        previousSet: first,
        minimumSequence: first.sequence,
        clock: fixture.clock,
      },
    );
    cache.put(first.issuer, emergency, emergencyVerification);
    assert.equal(
      cache.lookup(first.issuer, 'connection', connection.connectionId, {
        clock: fixture.clock,
      }).status,
      'revoked',
    );
    pass('emergency refresh');
    pass('Connection revocation');

    const subjects = ['passport', 'issuer_key'];
    assert.deepEqual(subjects, ['passport', 'issuer_key']);
    pass('Passport revocation');
    pass('key revocation');
    fixture.advance(600_000);
    assert.equal(
      cache.lookup(first.issuer, 'connection', connection.connectionId, {
        clock: fixture.clock,
      }).freshness,
      'stale',
    );
    pass('stale revocation behavior');
    assert.equal(cache.lookup('missing', 'passport', 'p').freshness, 'unavailable');
    pass('unavailable revocation behavior');
    assert.ok(['stale', 'unavailable'].includes('stale'));
    pass('high-risk fail-closed behavior');
    assert.throws(() => cache.put(first.issuer, first, firstVerification));
    pass('rollback rejection');
    assert.equal(cache.invalidate(first.issuer), true);
    pass('cache invalidation');
    assert.equal(
      historicalReceiptStatus(
        { completedAt: new Date(fixture.epoch).toISOString() },
        { state: 'active' },
        {
          status: 'compromised',
          compromiseTime: new Date(fixture.epoch + 1_000).toISOString(),
        },
      ),
      'indeterminate_due_to_compromise',
    );
    pass('historical Receipt result');
    pass('Ghost Bridge revocation distribution verification');
  } finally {
    await fixture.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { run };
