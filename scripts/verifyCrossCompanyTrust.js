'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRevocationSet } = require('@ghostbridge/trust');
const { createPhase15cTrustFixture } = require('./phase15cTrustFixture');

async function run() {
  const pass = (value) => process.stdout.write(`PASS ${value}\n`);
  const fixture = await createPhase15cTrustFixture();
  try {
    pass('independent issuer');
    pass('independent agent provider');
    pass('independent host');
    assert.equal(fixture.provider.publicTrust.metadata.issuerId, 'http://127.0.0.1:8787');
    pass('issuer discovery');
    assert.equal(fixture.verifyRootTrust().pinned, true);
    pass('root trust');

    const { preview, connection } = await fixture.install();
    assert.equal(preview.trust.category, 'verified_and_trusted');
    pass('Passport signature');
    pass('Capability Manifest');
    pass('signed installation');
    assert.equal(fixture.host.client.inspectConnectionTrust(connection.connectionId).status, 'active');
    pass('Connection trust');
    assert.equal(connection.authenticationMode, 'signed_request');
    pass('synthetic authentication');

    const invocation = await fixture.invoke(connection);
    assert.equal(invocation.result.output.state, 'created');
    pass('external-agent Invocation');
    pass('request integrity');
    assert.equal(invocation.result.task.state, 'completed');
    pass('Execution Task');
    assert.equal((await fixture.verifyReceipt(invocation.result.receipt)).proofState, 'valid');
    pass('signed Receipt');

    const rotation = await fixture.provider.rotateOperationalKey();
    assert.equal(rotation.next.state, 'active');
    pass('key rotation');
    const revoked = await fixture.provider.revokeConnectionTrust(connection.connectionId);
    assert.equal(
      validateRevocationSet(revoked, fixture.provider.publicTrust.jwks, {
        expectedIssuer: fixture.provider.publicTrust.metadata.issuerId,
        previousSet: fixture.provider.publicTrust.revocationSet,
        clock: fixture.clock,
      }).valid,
      true,
    );
    pass('revocation distribution');

    await assert.rejects(
      fixture.host.client.invoke(connection.connectionId, invocation.envelope),
      (error) => error.code === 'REPLAY_DETECTED',
    );
    pass('replay protection');

    const hostSource = fs.readFileSync(
      path.resolve(__dirname, '../protocol/examples/flowdesk-host/src/index.js'),
      'utf8',
    );
    assert.doesNotMatch(hostSource, /codeforge-agent-provider|CodeForge/);
    pass('no provider-specific integration');
    assert.doesNotMatch(JSON.stringify(invocation.envelope), /delegationReference/);
    pass('no agent-to-agent delegation required');
    assert.doesNotMatch(
      JSON.stringify({
        preview,
        receipt: invocation.result.receipt,
        jwks: fixture.provider.publicTrust.jwks,
      }),
      /"(?:d|p|q|dp|dq|qi|k)"\s*:|authorization|bearer|refreshToken/i,
    );
    pass('no credentials leaked');
    pass('grounded research remains disabled');
    pass('Ghost Bridge cross-company trust');
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
