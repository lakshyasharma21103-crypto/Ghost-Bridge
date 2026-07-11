const assert = require('node:assert/strict');
const test = require('node:test');
const { env } = require('../config/env');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  externalTestAgentUrl,
  EXTERNAL_AGENT_RUNTIME_PATH,
  parseSafeUrl,
} = require('../utils/safeFetch');

function withEnvironment(overrides, callback) {
  const previous = Object.fromEntries(Object.keys(overrides).map((key) => [key, env[key]]));
  Object.assign(env, overrides);
  try {
    return callback();
  } finally {
    Object.assign(env, previous);
  }
}

test('development private-runtime allowance is limited to the exact configured external routes', () => {
  withEnvironment(
    {
      NODE_ENV: 'development',
      EXTERNAL_TEST_AGENT_BASE_URL: 'http://127.0.0.1:5002',
      ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV: true,
    },
    () => {
      const endpoint = externalTestAgentUrl(EXTERNAL_AGENT_RUNTIME_PATH);
      assert.equal(
        parseSafeUrl(endpoint, { allowDevelopmentExternalAgent: true }).toString(),
        endpoint,
      );
      assert.throws(
        () =>
          parseSafeUrl('http://127.0.0.1:5002/admin', {
            allowDevelopmentExternalAgent: true,
          }),
        { code: ErrorCodes.UNSAFE_URL },
      );
      assert.throws(
        () =>
          parseSafeUrl('http://127.0.0.1:5003/v1/research/invoke', {
            allowDevelopmentExternalAgent: true,
          }),
        { code: ErrorCodes.UNSAFE_URL },
      );
    },
  );
});

test('production rejects the private external runtime even when the development flag is true', () => {
  withEnvironment(
    {
      NODE_ENV: 'production',
      EXTERNAL_TEST_AGENT_BASE_URL: 'http://127.0.0.1:5002',
      ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV: true,
    },
    () => {
      assert.throws(
        () =>
          parseSafeUrl('http://127.0.0.1:5002/v1/research/invoke', {
            allowDevelopmentExternalAgent: true,
          }),
        { code: ErrorCodes.UNSAFE_URL },
      );
    },
  );
});
