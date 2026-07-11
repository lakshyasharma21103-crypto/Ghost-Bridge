const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { createApp } = require('../app');
const { env } = require('../config/env');

test('the backend app and API route modules load cleanly', () => {
  const app = createApp();
  assert.equal(typeof app, 'function');
});

test('development-only demo and sandbox routes are mounted only in development', () => {
  const app = createApp();
  const routes = app._router.stack
    .flatMap((layer) => layer.handle?.stack || [])
    .map((layer) => layer.regexp.toString());

  if (env.NODE_ENV === 'development') {
    assert.ok(routes.some((route) => route.includes('api\\/v1\\/demo')));
    assert.ok(routes.some((route) => route.includes('api\\/v1\\/developer-sandbox')));
  } else {
    assert.equal(routes.some((route) => route.includes('api\\/v1\\/demo')), false);
    assert.equal(routes.some((route) => route.includes('api\\/v1\\/developer-sandbox')), false);
  }
});

test('development-only demo and sandbox routes are absent when the app loads in production mode', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "const { createApp } = require('./src/app'); const app = createApp(); const routes = app._router.stack.flatMap((layer) => layer.handle?.stack || []).map((layer) => String(layer.regexp)); const mounted = routes.some((route) => route.includes('demo') || route.includes('developer-sandbox')); process.stdout.write(mounted ? 'true' : 'false');",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example.com/agent-passport-runtime-gateway',
        CREDENTIAL_ENCRYPTION_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      },
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'false');
});
