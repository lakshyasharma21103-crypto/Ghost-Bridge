'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createFlowDeskHost } = require('../src');

test('host accepts only generic resolver and protocol handlers', () => {
  const host = createFlowDeskHost({
    installGrantResolver: async () => ({ baseUrl: 'http://127.0.0.1:8787' }),
  });
  assert.equal(typeof host.previewExternalAgent, 'function');
  host.close();
});

test('host source has no provider import, adapter, private DTO, or provider-name branch', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
  assert.doesNotMatch(source, /codeforge|ledgerworks|providerName|provider-specific|adapter/i);
  assert.doesNotMatch(source, /Backend|frontend\/src|mongoose|database/i);
});
