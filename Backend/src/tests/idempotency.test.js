const assert = require('node:assert/strict');
const test = require('node:test');
const {
  canonicalize,
  createInvocationIdempotency,
  normalizeClientKey,
} = require('../utils/idempotency');
const { ErrorCodes } = require('../utils/errorCodes');

test('request fingerprints are stable across object key order and contain no raw request values', () => {
  const first = createInvocationIdempotency({
    clientKey: 'stable-key-123456789',
    connectionId: 'connection-a',
    capability: 'research_topic',
    input: { nested: { beta: 2, alpha: 1 }, topic: 'private topic' },
  });
  const second = createInvocationIdempotency({
    clientKey: 'stable-key-123456789',
    connectionId: 'connection-a',
    capability: 'research_topic',
    input: { topic: 'private topic', nested: { alpha: 1, beta: 2 } },
  });

  assert.equal(first.keyHash, second.keyHash);
  assert.equal(first.requestFingerprint, second.requestFingerprint);
  assert.match(first.keyHash, /^hmac-sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(first), /stable-key|private topic/);
});

test('idempotency operation scope is connection-specific while tenant isolation is database-enforced', () => {
  const first = createInvocationIdempotency({
    clientKey: 'shared-client-key',
    connectionId: 'connection-a',
    capability: 'research_topic',
    input: { topic: 'same' },
  });
  const second = createInvocationIdempotency({
    clientKey: 'shared-client-key',
    connectionId: 'connection-b',
    capability: 'research_topic',
    input: { topic: 'same' },
  });

  assert.equal(first.keyHash, second.keyHash);
  assert.notEqual(first.scope, second.scope);
  assert.notEqual(first.requestFingerprint, second.requestFingerprint);
});

test('missing client keys create internal identifiers without implying a client retry guarantee', () => {
  const generated = normalizeClientKey(undefined);
  assert.equal(generated.clientProvided, false);
  assert.match(generated.value, /^[a-f0-9-]{36}$/i);
});

test('invalid and oversized idempotency keys are rejected without echoing their value', () => {
  assert.throws(() => normalizeClientKey(' '.repeat(3)), {
    code: ErrorCodes.IDEMPOTENCY_KEY_INVALID,
  });
  assert.throws(() => normalizeClientKey('x'.repeat(257)), {
    code: ErrorCodes.IDEMPOTENCY_KEY_INVALID,
  });
  assert.equal(canonicalize({ b: 2, a: 1 }), '{"a":1,"b":2}');
});
