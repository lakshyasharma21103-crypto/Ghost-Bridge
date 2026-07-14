const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  RetryDecisionReasons,
  boundedBackoffDelay,
  retryConfiguration,
  retryPolicyDecision,
} = require('../utils/retryPolicy');
const { integerInRangeFromEnv } = require('../config/env');

const NO_JITTER = {
  maxAttempts: 2,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
  jitterPercent: 0,
  random: () => 0.5,
};

test('429, 502, 503, and 504 permit bounded retries only for an idempotent safe operation', () => {
  for (const providerHttpStatus of [429, 502, 503, 504]) {
    const decision = retryPolicyDecision(
      {
        errorCode: 'RUNTIME_INVOCATION_FAILED',
        providerHttpStatus,
        operation: 'provider_readiness_check',
        httpMethod: 'GET',
        attemptNumber: 1,
      },
      NO_JITTER,
    );
    assert.deepEqual(decision, {
      allowed: true,
      reason: 'TRANSIENT_IDEMPOTENT_FAILURE',
      delayMs: 1_000,
      nextAttemptNumber: 2,
    });
  }
});

test('authentication, policy, schema, unsafe URL, source, and malformed failures never retry', () => {
  const cases = [
    ['GEMINI_AUTHENTICATION_FAILED', RetryDecisionReasons.AUTHENTICATION_FAILURE],
    ['FORBIDDEN', RetryDecisionReasons.POLICY_DENIAL],
    ['CAPABILITY_INPUT_INVALID', RetryDecisionReasons.SCHEMA_VALIDATION_FAILURE],
    ['UNSAFE_URL', RetryDecisionReasons.UNSAFE_URL],
    ['GEMINI_SOURCE_EXTRACTION_FAILED', RetryDecisionReasons.SOURCE_EXTRACTION_FAILURE],
    ['RUNTIME_OUTPUT_INVALID', RetryDecisionReasons.MALFORMED_PROVIDER_RESPONSE],
  ];
  for (const [errorCode, reason] of cases) {
    const decision = retryPolicyDecision(
      {
        errorCode,
        providerHttpStatus: 503,
        retryable: true,
        operation: 'runtime_invocation',
        httpMethod: 'POST',
        attemptNumber: 1,
      },
      NO_JITTER,
    );
    assert.equal(decision.allowed, false, errorCode);
    assert.equal(decision.reason, reason, errorCode);
  }
});

test('install-key consumption and grounded research are denied regardless of transient status', () => {
  assert.equal(
    retryPolicyDecision(
      {
        errorCode: 'SAFE_FETCH_TIMEOUT',
        retryable: true,
        operation: 'install_key_consumption',
        attemptNumber: 1,
      },
      NO_JITTER,
    ).reason,
    RetryDecisionReasons.INSTALL_KEY_OPERATION_NOT_RETRYABLE,
  );
  assert.equal(
    retryPolicyDecision(
      {
        errorCode: 'GEMINI_REQUEST_TIMEOUT',
        retryable: true,
        operation: 'grounded_research',
        attemptNumber: 1,
      },
      NO_JITTER,
    ).reason,
    RetryDecisionReasons.GROUNDED_RESEARCH_NOT_AUTOMATICALLY_RETRIED,
  );
});

test('side-effecting runtime calls require explicit client and remote idempotency proof', () => {
  const base = {
    errorCode: 'SAFE_FETCH_TIMEOUT',
    retryable: true,
    operation: 'runtime_invocation',
    httpMethod: 'POST',
    attemptNumber: 1,
    capabilityRetryPolicy: 'allow',
    mayCreateExternalSideEffects: true,
  };
  assert.equal(
    retryPolicyDecision(base, NO_JITTER).reason,
    RetryDecisionReasons.CLIENT_IDEMPOTENCY_NOT_PROVIDED,
  );
  assert.equal(
    retryPolicyDecision({ ...base, clientIdempotencyProvided: true }, NO_JITTER).reason,
    RetryDecisionReasons.REMOTE_IDEMPOTENCY_NOT_CONFIRMED,
  );
  assert.deepEqual(
    retryPolicyDecision(
      {
        ...base,
        clientIdempotencyProvided: true,
        idempotencySupported: true,
        remoteIdempotencyAcknowledged: true,
      },
      NO_JITTER,
    ),
    {
      allowed: true,
      reason: RetryDecisionReasons.TRANSIENT_IDEMPOTENT_FAILURE,
      delayMs: 1_000,
      nextAttemptNumber: 2,
    },
  );
});

test('capability policy and maximum attempts are enforced before scheduling', () => {
  const input = {
    errorCode: 'SAFE_FETCH_TIMEOUT',
    retryable: true,
    operation: 'runtime_invocation',
    httpMethod: 'POST',
    clientIdempotencyProvided: true,
    idempotencySupported: true,
    remoteIdempotencyAcknowledged: true,
    mayCreateExternalSideEffects: true,
    attemptNumber: 1,
  };
  assert.equal(
    retryPolicyDecision(input, NO_JITTER).reason,
    RetryDecisionReasons.CAPABILITY_RETRY_NOT_ENABLED,
  );
  assert.equal(
    retryPolicyDecision({ ...input, capabilityRetryPolicy: 'allow', attemptNumber: 2 }, NO_JITTER)
      .reason,
    RetryDecisionReasons.MAX_ATTEMPTS_REACHED,
  );
});

test('exponential backoff and jitter are strictly bounded', () => {
  const options = {
    maxAttempts: 5,
    baseDelayMs: 1_000,
    maxDelayMs: 5_000,
    jitterPercent: 20,
  };
  assert.equal(boundedBackoffDelay(1, { ...options, random: () => 0 }), 800);
  assert.equal(boundedBackoffDelay(1, { ...options, random: () => 1 }), 1_200);
  assert.equal(boundedBackoffDelay(10, { ...options, random: () => 1 }), 5_000);
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const delay = boundedBackoffDelay(attempt, { ...options, random: () => 0.75 });
    assert.ok(delay >= 0 && delay <= options.maxDelayMs);
  }
});

test('retry and environment configuration reject invalid limits', () => {
  assert.throws(
    () => retryConfiguration({ maxAttempts: 0 }),
    /maxAttempts must be a positive integer/,
  );
  assert.throws(
    () => retryConfiguration({ baseDelayMs: 2_000, maxDelayMs: 1_000 }),
    /maxDelayMs must be an integer greater than or equal to baseDelayMs/,
  );
  assert.throws(
    () => retryConfiguration({ jitterPercent: 101 }),
    /jitterPercent must be an integer between 0 and 100/,
  );

  const original = process.env.TEST_RETRY_SETTING;
  try {
    process.env.TEST_RETRY_SETTING = '0';
    assert.throws(
      () => integerInRangeFromEnv('TEST_RETRY_SETTING', 20, 1, 100),
      /must be an integer between 1 and 100/,
    );
    process.env.TEST_RETRY_SETTING = '20';
    assert.equal(integerInRangeFromEnv('TEST_RETRY_SETTING', 10, 1, 100), 20);
  } finally {
    if (original === undefined) delete process.env.TEST_RETRY_SETTING;
    else process.env.TEST_RETRY_SETTING = original;
  }
});

test('environment loading rejects inconsistent retry and execution lease bounds', () => {
  const backendDirectory = path.resolve(__dirname, '../..');
  const loadWith = (environment) =>
    spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
      cwd: backendDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ...environment,
      },
    });

  const invertedBackoff = loadWith({
    RUNTIME_RETRY_BASE_DELAY_MS: '2000',
    RUNTIME_RETRY_MAX_DELAY_MS: '1000',
  });
  assert.notEqual(invertedBackoff.status, 0);
  assert.match(
    invertedBackoff.stderr,
    /RUNTIME_RETRY_MAX_DELAY_MS must be greater than or equal to RUNTIME_RETRY_BASE_DELAY_MS/,
  );

  const shortLease = loadWith({
    RUNTIME_INVOCATION_TIMEOUT_MS: '5000',
    RUNTIME_EXECUTION_LEASE_MS: '5000',
  });
  assert.notEqual(shortLease.status, 0);
  assert.match(
    shortLease.stderr,
    /RUNTIME_EXECUTION_LEASE_MS must be greater than RUNTIME_INVOCATION_TIMEOUT_MS/,
  );
});
