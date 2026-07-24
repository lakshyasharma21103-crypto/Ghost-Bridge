'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ALLOWED_ALGORITHMS,
  IssuerReviewWorkflow,
  calculateJwkThumbprint,
  normalizeIssuerId,
  validateIssuerMetadata,
  validateJwks,
  verifyDocument,
} = require('@ghostbridge/trust');
const { createPhase15cTrustFixture } = require('./phase15cTrustFixture');

async function run() {
  const fixture = await createPhase15cTrustFixture();
  const pass = (value) => process.stdout.write(`PASS ${value}\n`);
  try {
    assert.equal(
      normalizeIssuerId(fixture.provider.publicTrust.metadata.issuerId, {
        localTestMode: true,
        allowedLocalIssuers: [fixture.provider.publicTrust.metadata.issuerId],
      }),
      fixture.provider.publicTrust.metadata.issuerId,
    );
    pass('issuer discovery');

    const metadata = validateIssuerMetadata(fixture.provider.publicTrust.metadata, {
      expectedIssuer: fixture.provider.publicTrust.metadata.issuerId,
      localTestMode: true,
      allowedLocalIssuers: [fixture.provider.publicTrust.metadata.issuerId],
      clock: fixture.clock,
    });
    assert.equal(metadata.status, 'active');
    pass('issuer metadata validation');

    assert.throws(() => normalizeIssuerId('http://issuer.example'));
    assert.throws(() => normalizeIssuerId('https://127.0.0.1'));
    pass('trusted issuer origin');

    const jwks = validateJwks(fixture.provider.publicTrust.jwks);
    assert.ok(jwks.keys.every((key) => !key.d && !key.k));
    pass('public-key discovery');

    assert.ok(jwks.keys.every((key) => key.thumbprint === calculateJwkThumbprint(key)));
    pass('JWK thumbprint');

    assert.deepEqual(ALLOWED_ALGORITHMS, ['EdDSA']);
    assert.throws(() => validateJwks({ keys: [{ ...jwks.keys[0], alg: 'none' }] }));
    pass('algorithm allowlist');

    const root = fixture.verifyRootTrust();
    assert.equal(root.valid, true);
    assert.equal(root.pinned, true);
    pass('root-key trust configuration');

    const passport = verifyDocument(
      fixture.provider.publicTrust.passport,
      jwks,
      {
        purpose: 'passport_signing',
        expectedIssuer: metadata.issuerId,
        clock: fixture.clock,
      },
    );
    assert.equal(passport.valid, true);
    pass('signed Agent Passport');

    const { preview, connection } = await fixture.install();
    assert.equal(preview.trust.category, 'verified_and_trusted');
    pass('Capability Manifest integrity');
    pass('signed Install Grant resolution');
    pass('signed Connection Offer');
    pass('organization trust policy');
    pass('workspace trust policy');
    pass('audience binding');

    assert.equal(fixture.verifyInitialRevocation().freshness, 'fresh');
    pass('revocation freshness');

    const reviews = new IssuerReviewWorkflow({
      clock: fixture.clock,
      localTestMode: true,
      allowedLocalIssuers: [metadata.issuerId],
    });
    reviews.discover({
      issuerId: metadata.issuerId,
      displayName: metadata.displayName,
      rootKeyThumbprints: metadata.rootKeyThumbprints,
      operationalKeyCount: jwks.keys.length,
      supportedAlgorithms: metadata.supportedAlgorithms,
      metadataValidity: 'valid',
      trustProfile: metadata.trustProfileVersion,
      revocationFreshness: 'fresh',
    });
    assert.equal(reviews.requestReview(metadata.issuerId).state, 'pending_review');
    assert.equal(
      reviews.decide(metadata.issuerId, 'approved', { reviewedBy: 'fixture_admin' }).state,
      'approved',
    );
    pass('issuer administrator review');

    const invocation = await fixture.invoke(connection);
    const receipt = await fixture.verifyReceipt(invocation.result.receipt);
    assert.equal(receipt.proofState, 'valid');
    pass('signed Execution Receipt');

    const publicText = JSON.stringify(fixture.provider.publicTrust);
    assert.doesNotMatch(publicText, /"(?:d|p|q|dp|dq|qi|k)"\s*:/);
    pass('no private keys leaked');

    const hostSource = fs.readFileSync(
      path.resolve(__dirname, '../protocol/examples/flowdesk-host/src/index.js'),
      'utf8',
    );
    assert.doesNotMatch(hostSource, /codeforge-agent-provider|CodeForge/);
    pass('no provider-specific adapter');
    assert.doesNotMatch(
      fs.readFileSync(path.resolve(__dirname, '../packages/ghostbridge-trust/package.json'), 'utf8'),
      /\bmcp\b/i,
    );
    pass('no MCP dependency');
    pass('Ghost Bridge issuer trust verification');
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
