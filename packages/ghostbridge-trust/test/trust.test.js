'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AntiRollbackStore,
  GhostBridgeTrustError,
  IssuerReviewWorkflow,
  ReplayCache,
  RevocationCache,
  calculateJwkThumbprint,
  canonicalize,
  digest,
  evaluateTrustPolicy,
  issuerDiscoveryUrl,
  normalizeIssuerId,
  parseJsonStrict,
  validateAudience,
  validateIssuerMetadata,
  validateJwks,
} = require('../src');

function expectCode(operation, code) {
  assert.throws(operation, (error) => error instanceof GhostBridgeTrustError && error.code === code);
}

test('normalizes exact HTTPS issuer origins', () => {
  assert.equal(normalizeIssuerId('https://ISSUER.Example:443/'), 'https://issuer.example');
  assert.equal(
    issuerDiscoveryUrl('https://issuer.example'),
    'https://issuer.example/.well-known/ghostbridge-issuer',
  );
});

test('allows localhost HTTP only in explicitly allowlisted local fixture mode', () => {
  expectCode(() => normalizeIssuerId('http://127.0.0.1:8787'), 'ISSUER_INVALID');
  assert.equal(
    normalizeIssuerId('http://127.0.0.1:8787', {
      localTestMode: true,
      allowedLocalIssuers: ['http://127.0.0.1:8787'],
    }),
    'http://127.0.0.1:8787',
  );
  expectCode(
    () =>
      normalizeIssuerId('http://127.0.0.1:9999', {
        localTestMode: true,
        allowedLocalIssuers: ['http://127.0.0.1:8787'],
      }),
    'UNSAFE_DISCOVERY_TARGET',
  );
});

test('rejects unsafe issuer identifiers', () => {
  for (const value of [
    'file:///tmp/issuer',
    'https://user@example.com',
    'https://issuer.example/#fragment',
    'https://issuer.example/path',
    'http://10.0.0.1',
  ]) {
    assert.throws(() => normalizeIssuerId(value), GhostBridgeTrustError);
  }
});

test('canonicalization is deterministic and bounded', () => {
  assert.equal(canonicalize({ z: 1, a: { y: true, x: [] } }), '{"a":{"x":[],"y":true},"z":1}');
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
  assert.throws(() => canonicalize({ value: Number.NaN }), GhostBridgeTrustError);
  assert.throws(() => canonicalize({ value: '\ud800' }), GhostBridgeTrustError);
});

test('strict JSON rejects duplicate and prototype-pollution keys', () => {
  expectCode(() => parseJsonStrict('{"a":1,"a":2}'), 'PROOF_INVALID');
  expectCode(() => parseJsonStrict('{"nested":{"constructor":1}}'), 'PROOF_INVALID');
  assert.deepEqual(parseJsonStrict('{"a":1,"nested":{"b":2}}'), { a: 1, nested: { b: 2 } });
});

test('JWK thumbprints follow stable public members', () => {
  const key = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: '11qYAYdk9JgNcGX5L8g8R4v7JY4V8Z9f5h3h2m1n0AA',
  };
  assert.equal(calculateJwkThumbprint(key), calculateJwkThumbprint({ ...key, kid: 'ignored' }));
});

test('JWKS validation rejects private material and duplicate kid', () => {
  const key = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: '11qYAYdk9JgNcGX5L8g8R4v7JY4V8Z9f5h3h2m1n0AA',
    kid: 'key_1',
    use: 'sig',
    alg: 'EdDSA',
    state: 'active',
    notBefore: '2025-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    purpose: ['passport_signing'],
  };
  key.thumbprint = calculateJwkThumbprint(key);
  assert.equal(validateJwks({ keys: [key] }).keys.length, 1);
  expectCode(() => validateJwks({ keys: [{ ...key, d: 'private' }] }), 'JWKS_INVALID');
  expectCode(() => validateJwks({ keys: [key, key] }), 'JWKS_INVALID');
  expectCode(() => validateJwks({ keys: [{ ...key, alg: 'none' }] }), 'ALGORITHM_NOT_ALLOWED');
  expectCode(
    () => validateJwks({ keys: [{ ...key, testOnly: true }] }, { productionMode: true }),
    'JWKS_INVALID',
  );
});

test('issuer metadata validates exact issuer, sequence, status, and expiry', () => {
  const base = {
    protocolVersion: 'ghostbridge/0.1-draft',
    trustProfileVersion: 'ghostbridge-trust/0.1-draft',
    metadataVersion: '0.1-draft',
    issuerId: 'https://issuer.example',
    displayName: 'Issuer',
    status: 'active',
    issuedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2028-01-01T00:00:00.000Z',
    supportedProtocolVersions: ['ghostbridge/0.1-draft'],
    supportedTrustProfiles: ['ghostbridge-trust/0.1-draft'],
    supportedProofProfiles: ['ghostbridge-proof/0.1-draft'],
    supportedAlgorithms: ['EdDSA'],
    jwksUri: 'https://issuer.example/.well-known/jwks.json',
    revocationSetUri: 'https://issuer.example/.well-known/revocations.json',
    rootKeyThumbprints: ['thumbprint'],
    metadataSequence: 2,
  };
  assert.equal(
    validateIssuerMetadata(base, {
      expectedIssuer: 'https://issuer.example',
      clock: () => Date.parse('2026-06-01T00:00:00.000Z'),
    }).metadataSequence,
    2,
  );
  expectCode(
    () =>
      validateIssuerMetadata(base, {
        expectedIssuer: 'https://other.example',
        clock: () => Date.parse('2026-06-01T00:00:00.000Z'),
      }),
    'ISSUER_MISMATCH',
  );
  expectCode(
    () =>
      validateIssuerMetadata(base, {
        expectedIssuer: base.issuerId,
        minimumMetadataSequence: 3,
        clock: () => Date.parse('2026-06-01T00:00:00.000Z'),
      }),
    'ISSUER_METADATA_ROLLBACK',
  );
});

test('audience binding rejects wildcard and mismatch', () => {
  assert.equal(validateAudience(['flowdesk-host', 'org:acme'], ['flowdesk-host']), true);
  expectCode(() => validateAudience('*', 'flowdesk-host'), 'AUDIENCE_MISMATCH');
  expectCode(() => validateAudience('another-host', 'flowdesk-host'), 'AUDIENCE_MISMATCH');
});

test('organization and workspace policies cannot silently trust unknown issuers', () => {
  const trusted = evaluateTrustPolicy({
    issuerId: 'https://issuer.example',
    organizationPolicy: { allowedIssuerIds: ['https://issuer.example'] },
    workspacePolicy: { allowedIssuerIds: ['https://issuer.example'] },
  });
  assert.equal(trusted.category, 'verified_and_trusted');
  const unknown = evaluateTrustPolicy({
    issuerId: 'https://unknown.example',
    organizationPolicy: { unknownIssuerBehavior: 'administrator_review' },
  });
  assert.equal(unknown.category, 'cryptographically_valid_review_required');
  const highImpact = evaluateTrustPolicy({
    issuerId: 'https://unknown.example',
    highImpact: true,
    organizationPolicy: { unknownIssuerBehavior: 'administrator_review' },
  });
  assert.equal(highImpact.category, 'cryptographically_valid_untrusted_issuer');
});

test('issuer review workflow is explicit, scoped, bounded, and audited', () => {
  const events = [];
  const clock = () => Date.parse('2026-06-01T00:00:00.000Z');
  const reviews = new IssuerReviewWorkflow({
    clock,
    audit: (event, fields) => events.push({ event, fields }),
  });
  const discovered = reviews.discover({
    issuerId: 'https://issuer.example',
    displayName: 'Example Issuer',
    rootKeyThumbprints: ['root-thumbprint'],
    operationalKeyCount: 2,
    supportedAlgorithms: ['EdDSA'],
    metadataValidity: 'valid',
    revocationFreshness: 'fresh',
  });
  assert.equal(discovered.state, 'discovered');
  assert.equal(reviews.requestReview(discovered.issuerId).state, 'pending_review');
  const approved = reviews.decide(discovered.issuerId, 'approved_with_limits', {
    reviewedBy: 'admin_1',
    approvedScope: {
      scope: 'workspace',
      workspaceId: 'workspace_1',
      selectedAgentIds: ['agent_1'],
      selectedCapabilityKeys: ['code.review'],
      riskCeiling: 'moderate',
      expiresAt: '2027-01-01T00:00:00.000Z',
    },
  });
  assert.equal(approved.approvedScope.workspaceId, 'workspace_1');
  assert.deepEqual(events.map(({ event }) => event), [
    'trust.issuer.discovered',
    'trust.issuer.review_requested',
    'trust.issuer.approved',
  ]);
  expectCode(
    () => reviews.decide(discovered.issuerId, 'approved', {}),
    'TRUST_POLICY_DENIED',
  );
});

test('replay cache atomically rejects repeated authenticated messages', () => {
  let now = 1_000;
  const replay = new ReplayCache({ clock: () => now });
  const record = {
    issuer: 'https://issuer.example',
    kid: 'key_1',
    messageId: 'message_1',
    audience: 'flowdesk',
    nonce: 'nonce_1',
    connectionId: 'connection_1',
    expiresAt: new Date(2_000).toISOString(),
  };
  assert.equal(replay.consume(record), true);
  expectCode(() => replay.consume(record), 'REPLAY_DETECTED');
  now = 2_001;
  expectCode(() => replay.consume(record), 'MESSAGE_EXPIRED');
});

test('anti-rollback store rejects older metadata and revocation sequences', () => {
  const store = new AntiRollbackStore();
  assert.equal(store.observe('metadata', 'issuer', 2), 2);
  expectCode(() => store.observe('metadata', 'issuer', 1), 'ISSUER_METADATA_ROLLBACK');
  assert.equal(store.observe('revocation', 'issuer', 4), 4);
  expectCode(() => store.observe('revocation', 'issuer', 3), 'REVOCATION_ROLLBACK');
});

test('revocation cache is issuer-scoped and rejects non-increasing updates', () => {
  const cache = new RevocationCache();
  const document = {
    sequence: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    nextUpdate: '2027-01-01T00:00:00.000Z',
    entries: [{ subjectType: 'passport', subjectReference: 'p1', status: 'revoked' }],
  };
  cache.put('issuer', document, { valid: true });
  assert.equal(
    cache.lookup('issuer', 'passport', 'p1', {
      clock: () => Date.parse('2026-06-01T00:00:00.000Z'),
    }).status,
    'revoked',
  );
  expectCode(() => cache.put('issuer', document, { valid: true }), 'REVOCATION_ROLLBACK');
});
