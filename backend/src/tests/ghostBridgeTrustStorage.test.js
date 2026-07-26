const assert = require('node:assert/strict');
const test = require('node:test');
const ConnectionTrustRecord = require('../models/ConnectionTrustRecord');
const IssuerTrustRecord = require('../models/IssuerTrustRecord');
const TrustReplayRecord = require('../models/TrustReplayRecord');
const trustMetrics = require('../services/trustMetrics.service');

test('Phase 15C trust models use scoped, replay-unique, and expiry indexes', () => {
  const issuerIndexes = IssuerTrustRecord.schema.indexes();
  assert.ok(
    issuerIndexes.some(([keys, options]) =>
      keys.organizationId === 1 &&
      keys.workspaceId === 1 &&
      keys.issuerId === 1 &&
      options.unique === true,
    ),
  );
  assert.ok(
    ConnectionTrustRecord.schema.indexes().some(([keys]) => keys.connectionId === 1),
  );
  assert.ok(
    TrustReplayRecord.schema.indexes().some(
      ([keys, options]) => keys.messageId === 1 && options.unique === true,
    ),
  );
  assert.ok(
    TrustReplayRecord.schema.indexes().some(
      ([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
});

test('trust metrics allow only bounded low-cardinality labels', () => {
  trustMetrics.reset();
  trustMetrics.increment('trust.passport.verification', {
    outcome: 'valid',
    category: 'verified_and_trusted',
    issuerId: 'https://sensitive-issuer.example',
    keyId: 'sensitive-key-id',
    organizationId: 'sensitive-organization',
  });
  const serialized = JSON.stringify(trustMetrics.snapshot());
  assert.match(serialized, /outcome=valid/);
  assert.doesNotMatch(serialized, /sensitive/);
});
