const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  generateInstallKey,
  hashKey,
  verifyKey,
  generatePartnerApiKey,
  hashPartnerApiKey,
  encryptPayload,
  decryptPayload,
} = require('../utils/crypto');
const { redactSecrets } = require('../utils/redact');
const {
  safeFetch,
  parseSafeUrl,
  stripSensitiveHeadersForCrossOriginRedirect,
} = require('../utils/safeFetch');
const { auditLogPayload } = require('../services/auditService');
const { ErrorCodes } = require('../utils/errorCodes');
const { AppError } = require('../utils/AppError');
const { toApiErrorResponse } = require('../utils/apiError');
const { errorHandler } = require('../middleware/errorHandler');
const { requestId } = require('../middleware/requestId');
const { isRetryableError } = require('../utils/retryability');
const { getHealth, getReadiness } = require('../controllers/healthController');

test('install keys are generated securely and hashes do not contain raw keys', () => {
  const first = generateInstallKey();
  const second = generateInstallKey();

  assert.match(first, /^agentpass_install_[A-Za-z0-9_-]{32,}$/);
  assert.match(second, /^agentpass_install_[A-Za-z0-9_-]{32,}$/);
  assert.notEqual(first, second);

  const hash = hashKey(first);
  assert.equal(hash.includes(first), false);
  assert.equal(verifyKey(first, hash), true);
  assert.equal(verifyKey(second, hash), false);
});

test('partner API keys can be generated, hashed, and verified', () => {
  const key = generatePartnerApiKey();
  const hash = hashPartnerApiKey(key);

  assert.match(key, /^agentpass_partner_[A-Za-z0-9_-]{32,}$/);
  assert.equal(hash.includes(key), false);
  assert.equal(verifyKey(key, hash), true);
});

test('credential encryption and decryption round trips without plaintext in encrypted payload', () => {
  const payload = {
    type: 'delegated_runtime_access',
    access_token: 'secret-token-value',
    nested: { api_key: 'secret-api-key' },
  };

  const encrypted = encryptPayload(payload);
  const serialized = JSON.stringify(encrypted);

  assert.equal(encrypted.algorithm, 'aes-256-gcm');
  assert.equal(serialized.includes('secret-token-value'), false);
  assert.equal(serialized.includes('secret-api-key'), false);
  assert.deepEqual(decryptPayload(encrypted), payload);
});

test('redaction removes headers, tokens, cookies, install keys, and encrypted payloads', () => {
  const raw = generateInstallKey();
  const rawPartnerKey = generatePartnerApiKey();
  const redacted = redactSecrets({
    headers: {
      Authorization: 'Bearer super-secret-bearer-token',
      cookie: 'session=abc123; theme=light',
      'X-Partner-Api-Key': rawPartnerKey,
    },
    body: {
      api_key: 'secret-api-key',
      access_token: 'secret-access-token',
      refresh_token: 'secret-refresh-token',
      password: 'secret-password',
      installKey: raw,
      encryptedPayload: { ciphertext: 'abc', iv: 'def', tag: 'ghi' },
      note: `copied ${raw}`,
    },
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes(raw), false);
  assert.equal(serialized.includes(rawPartnerKey), false);
  assert.equal(serialized.includes('super-secret-bearer-token'), false);
  assert.equal(serialized.includes('secret-api-key'), false);
  assert.equal(serialized.includes('secret-access-token'), false);
  assert.equal(serialized.includes('secret-refresh-token'), false);
  assert.equal(serialized.includes('secret-password'), false);
  assert.equal(serialized.includes('abc'), false);
});

test('safeFetch blocks unsafe URLs before making outbound requests', async () => {
  await assert.rejects(() => safeFetch('file:///tmp/passport.json'), {
    code: ErrorCodes.UNSAFE_URL,
  });
  await assert.rejects(() => safeFetch('ftp://example.com/passport.json'), {
    code: ErrorCodes.UNSAFE_URL,
  });
  await assert.rejects(() => safeFetch('http://127.0.0.1:8080/passport.json'), {
    code: ErrorCodes.UNSAFE_URL,
  });
  await assert.rejects(() => safeFetch('https://localhost/passport.json'), {
    code: ErrorCodes.UNSAFE_URL,
  });
});

test('safeFetch production mode requires HTTPS', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "const { parseSafeUrl } = require('./src/utils/safeFetch'); try { parseSafeUrl('http://example.com'); process.exit(1); } catch (error) { console.log(error.code); }",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example.com/passport',
        CREDENTIAL_ENCRYPTION_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), ErrorCodes.UNSAFE_URL);
});

test('missing encryption key fails clearly outside development', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://example.com/passport',
      CREDENTIAL_ENCRYPTION_KEY: '',
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stderr}${result.stdout}`,
    /CREDENTIAL_ENCRYPTION_KEY is required outside development/,
  );
});

test('audit log payload redacts sensitive metadata before storage', () => {
  const raw = generateInstallKey();
  const payload = auditLogPayload(
    'partner',
    'partner_123',
    'install_key.created',
    'PassportInstallKey',
    'install_key_123',
    {
      installKey: raw,
      Authorization: 'Bearer very-secret-value',
      nested: {
        encryptedPayload: encryptPayload({ access_token: 'secret' }),
      },
    },
    'req_test',
  );

  const serialized = JSON.stringify(payload.metadata);
  assert.equal(serialized.includes(raw), false);
  assert.equal(serialized.includes('very-secret-value'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(payload.requestId, 'req_test');
});

test('API error responses redact sensitive messages and details', () => {
  const rawInstallKey = generateInstallKey();
  const result = toApiErrorResponse(
    new AppError(400, ErrorCodes.VALIDATION_ERROR, `Bearer very-secret-token ${rawInstallKey}`, [
      { access_token: 'very-secret-token', installKey: rawInstallKey },
    ]),
    rawInstallKey,
  );
  const serialized = JSON.stringify(result.body);

  assert.equal(serialized.includes('very-secret-token'), false);
  assert.equal(serialized.includes(rawInstallKey), false);
  assert.equal(result.body.error.details[0].access_token, '[redacted]');
});

test('API error responses never include stack traces', () => {
  const response = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  errorHandler(
    new Error('Bearer very-secret-token'),
    { requestId: 'req_test' },
    response,
    () => {},
  );
  const serialized = JSON.stringify(response.payload);

  assert.equal(response.statusCode, 500);
  assert.equal(serialized.includes('stack'), false);
  assert.equal(serialized.includes('very-secret-token'), false);
});

test('request IDs reject secret-shaped external values', () => {
  const rawInstallKey = generateInstallKey();
  let nextCalled = false;
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
  const request = {
    header(name) {
      return name === 'X-Request-Id' ? rawInstallKey : undefined;
    },
  };

  requestId(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.notEqual(request.requestId, rawInstallKey);
  assert.match(request.requestId, /^req_[A-Za-z0-9-]{36}$/);
  assert.equal(response.headers['X-Request-Id'], request.requestId);
  assert.match(request.traceId, /^trace_/);
});

test('valid trace IDs are preserved and oversized trace IDs are replaced', () => {
  function run(traceId) {
    const response = {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
    };
    const request = {
      header(name) {
        return name === 'X-Trace-Id' ? traceId : undefined;
      },
    };
    requestId(request, response, () => {});
    return { request, response };
  }
  const preserved = run('trace_safe-operation-123');
  assert.equal(preserved.request.traceId, 'trace_safe-operation-123');
  assert.equal(preserved.response.headers['X-Trace-Id'], 'trace_safe-operation-123');
  const replaced = run(`trace_${'x'.repeat(200)}`);
  assert.notEqual(replaced.request.traceId, `trace_${'x'.repeat(200)}`);
  assert.match(replaced.request.traceId, /^trace_/);
});

test('retryability classification is deterministic', () => {
  assert.equal(isRetryableError({ code: 'SAFE_FETCH_TIMEOUT' }), true);
  assert.equal(isRetryableError({ statusCode: 503 }), true);
  assert.equal(isRetryableError({ code: ErrorCodes.INSTALL_KEY_INVALID, statusCode: 400 }), false);
  assert.equal(isRetryableError({ code: ErrorCodes.CAPABILITY_INPUT_INVALID }), false);
});

test('health is dependency-free while readiness fails safely without a database', () => {
  function response() {
    return {
      statusCode: 200,
      payload: undefined,
      status(value) {
        this.statusCode = value;
        return this;
      },
      json(value) {
        this.payload = value;
        return this;
      },
    };
  }
  const health = response();
  getHealth({}, health);
  assert.equal(health.statusCode, 200);
  assert.equal(health.payload.data.status, 'ok');
  const ready = response();
  getReadiness({}, ready);
  assert.equal(ready.statusCode, 503);
  assert.equal(ready.payload.data.status, 'not_ready');
  assert.equal(JSON.stringify(ready.payload).includes('mongodb://'), false);
});

test('redaction covers nested camelCase credentials, Authorization, and URL query secrets', () => {
  const secret = 'sensitive-value-12345678';
  const redacted = redactSecrets({
    nested: [{ partnerApiKey: secret, decryptedPayload: { runtimeToken: secret } }],
    headers: { Authorization: `Bearer ${secret}` },
    note: `https://example.test/path?installKey=${secret}&token=${secret}`,
    serialized: JSON.stringify({ accessToken: secret }),
    error: Object.assign(new Error(`provider failed for prompt ${secret}`), { topic: secret }),
  });
  assert.equal(JSON.stringify(redacted).includes(secret), false);
});

test('safe URL parser accepts public HTTPS URLs', () => {
  const parsed = parseSafeUrl('https://example.com/runtime');
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.hostname, 'example.com');
});

test('cross-origin redirects strip outbound credentials', () => {
  const headers = stripSensitiveHeadersForCrossOriginRedirect({
    Authorization: 'Bearer secret',
    Cookie: 'session=secret',
    'X-API-Key': 'secret-key',
    'X-Partner-Runtime': 'secret-custom-header',
    Accept: 'application/json',
  });

  assert.equal(headers.authorization, undefined);
  assert.equal(headers.cookie, undefined);
  assert.equal(headers['x-api-key'], undefined);
  assert.equal(headers['x-partner-runtime'], undefined);
  assert.equal(headers.accept, 'application/json');
});
