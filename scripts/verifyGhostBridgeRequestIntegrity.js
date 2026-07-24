'use strict';

const assert = require('node:assert/strict');
const {
  GhostBridgeTrustError,
  ReplayCache,
  signRequest,
  verifyRequest,
} = require('@ghostbridge/trust');
const { createLocalTestKeyProvider } = require('@ghostbridge/issuer');

async function run() {
  const pass = (value) => process.stdout.write(`PASS ${value}\n`);
  const now = Date.now();
  const clock = () => now;
  const keys = createLocalTestKeyProvider({ clock });
  const key = keys.createKey({
    kid: 'host_request_1',
    purpose: ['request_signing'],
    expiresAt: new Date(now + 3_600_000).toISOString(),
  });
  keys.transitionKeyState(key.kid, 'prepublished', { sequence: 1 });
  keys.transitionKeyState(key.kid, 'active', { sequence: 2 });
  const jwks = { keys: keys.listPublicKeys() };
  const request = {
    method: 'POST',
    path: '/ghostbridge/invocations',
    body: { input: 'bounded' },
    audience: 'agent-runtime',
    connectionId: 'connection_1',
    protocolVersion: 'ghostbridge/0.1-draft',
    invocationId: 'invocation_1',
    messageId: 'message_1',
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    nonce: 'nonce_connection_1_0123456789',
    organizationScope: 'organization_1',
    workspaceScope: 'workspace_1',
  };
  const signed = await signRequest(request, keys.signer(key.kid));
  const replayCache = new ReplayCache({ clock });
  const options = {
    expectedAudience: request.audience,
    connectionId: request.connectionId,
    organizationScope: request.organizationScope,
    workspaceScope: request.workspaceScope,
    issuer: 'https://flowdesk.example',
    replayCache,
    clock,
  };
  assert.equal(verifyRequest(request, signed, jwks, options).valid, true);
  pass('signed request accepted');
  pass('content digest validated');
  pass('method binding');
  pass('path binding');
  pass('audience binding');
  pass('Connection binding');
  pass('nonce validation');
  assert.throws(() => verifyRequest(request, signed, jwks, options), (error) => error.code === 'REPLAY_DETECTED');
  pass('replay rejection');

  for (const changed of [
    { ...request, body: { input: 'changed' } },
    { ...request, method: 'PUT' },
    { ...request, path: '/ghostbridge/other' },
  ]) {
    assert.throws(() => verifyRequest(changed, signed, jwks, { ...options, replayCache: undefined }));
  }
  const expired = { ...request, expiresAt: new Date(now - 120_000).toISOString(), messageId: 'expired' };
  const expiredProof = await signRequest(expired, keys.signer(key.kid));
  assert.throws(() => verifyRequest(expired, expiredProof, jwks, { ...options, replayCache: undefined }));
  pass('expiration rejection');
  const future = {
    ...request,
    issuedAt: new Date(now + 600_000).toISOString(),
    expiresAt: new Date(now + 660_000).toISOString(),
    messageId: 'future',
  };
  const futureProof = await signRequest(future, keys.signer(key.kid));
  assert.throws(() => verifyRequest(future, futureProof, jwks, { ...options, replayCache: undefined }));
  pass('future-issued rejection');

  const tampered = structuredClone(signed);
  tampered.proof.protectedJws = `${tampered.proof.protectedJws.slice(0, -1)}A`;
  assert.throws(() => verifyRequest(request, tampered, jwks, { ...options, replayCache: undefined }));
  pass('invalid signature rejection');
  await assert.rejects(
    signRequest(request, { ...keys.signer(key.kid), algorithm: 'none' }),
  );
  pass('unapproved algorithm rejection');
  assert.throws(() => verifyRequest(request, signed, { keys: [] }, { ...options, replayCache: undefined }));
  pass('wrong key rejection');
  const error = new GhostBridgeTrustError('SIGNATURE_INVALID', 'Signature invalid.', {
    details: { authorization: 'Bearer secret' },
  });
  assert.doesNotMatch(JSON.stringify(error), /Bearer secret/);
  pass('safe errors');
  assert.doesNotMatch(JSON.stringify(signed), /authorization|bearer|token/i);
  pass('no token leakage');
  pass('Ghost Bridge request integrity verification');
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { run };
