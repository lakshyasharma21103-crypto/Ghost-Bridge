const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  ExternalFlowVerificationError,
  VERIFICATION_REQUEST_TIMEOUT_MS,
  VERIFICATION_STAGES,
  formatVerificationFailure,
  wrapVerificationFailure,
} = require('../../scripts/verifyExternalFlow');
const { generateInstallKey, generatePartnerApiKey } = require('../utils/crypto');

test('runtime invocation timeout accepts at least 360000 milliseconds and rejects non-positive values', () => {
  const valid = spawnSync(
    process.execPath,
    [
      '-e',
      "process.stdout.write(String(require('./src/config/env').env.RUNTIME_INVOCATION_TIMEOUT_MS))",
    ],
    {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'development', RUNTIME_INVOCATION_TIMEOUT_MS: '360000' },
      encoding: 'utf8',
    },
  );
  assert.equal(valid.status, 0);
  assert.equal(Number(valid.stdout.trim()), 360_000);

  const invalid = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'development', RUNTIME_INVOCATION_TIMEOUT_MS: '0' },
    encoding: 'utf8',
  });
  assert.notEqual(invalid.status, 0);
  assert.match(`${invalid.stdout}${invalid.stderr}`, /must be a positive integer/);
});

test('external-flow verifier uses a long invocation timeout and never forces 70000 milliseconds', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../scripts/verifyExternalFlow.js'),
    'utf8',
  );

  assert.equal(VERIFICATION_REQUEST_TIMEOUT_MS >= 360_000, true);
  assert.match(source, /RUNTIME_INVOCATION_TIMEOUT_MS\s*=\s*'330000'/);
  assert.doesNotMatch(source, /RUNTIME_REQUEST_TIMEOUT_MS\s*=.*70000/);
});

test('timeout failures identify gateway_invocation and preserve the original cause', () => {
  const cause = new Error('socket aborted');
  cause.name = 'AbortError';
  cause.code = 'SAFE_FETCH_TIMEOUT';
  cause.statusCode = 504;
  cause.requestId = 'req_timeout-safe';
  const state = {
    stage: 'gateway_invocation',
    stageStartedAt: 1_000,
    connectionId: 'connection_123',
  };

  const wrapped = wrapVerificationFailure(cause, state, 1_250);

  assert.equal(wrapped.cause, cause);
  assert.equal(wrapped.stage, 'gateway_invocation');
  assert.equal(wrapped.httpStatus, 504);
  assert.equal(wrapped.applicationErrorCode, 'SAFE_FETCH_TIMEOUT');
  assert.equal(wrapped.timeoutReason, 'SAFE_FETCH_TIMEOUT');
  assert.equal(wrapped.requestId, 'req_timeout-safe');
  assert.equal(wrapped.durationMs, 250);
  assert.equal(wrapped.connectionId, 'connection_123');
  assert.match(formatVerificationFailure(wrapped), /Failed stage: gateway_invocation/);
});

test('verification diagnostics redact secrets without serializing the cause', () => {
  const installKey = generateInstallKey();
  const partnerKey = generatePartnerApiKey();
  const runtimeToken = 'runtime-secret-value-0123456789';
  const cause = new Error(
    `Bearer ${runtimeToken} install=${installKey} partner=${partnerKey} api-key-secret-value`,
  );
  const wrapped = wrapVerificationFailure(
    cause,
    {
      stage: 'secret_scan',
      stageStartedAt: 2_000,
      connectionId: installKey,
    },
    2_010,
  );
  const output = formatVerificationFailure(wrapped);

  assert.equal(wrapped.cause, cause);
  assert.equal(wrapped instanceof ExternalFlowVerificationError, true);
  assert.equal(output.includes(runtimeToken), false);
  assert.equal(output.includes(installKey), false);
  assert.equal(output.includes(partnerKey), false);
  assert.equal(output.includes('api-key-secret-value'), false);
  assert.match(output, /Safe message: External-flow verification failed\./);
  assert.equal(VERIFICATION_STAGES.includes(wrapped.stage), true);
});
