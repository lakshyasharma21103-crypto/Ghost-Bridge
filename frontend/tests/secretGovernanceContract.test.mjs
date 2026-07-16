import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Secrets UI uses non-repopulated password inputs and no browser storage', () => {
  const page = read('src/pages/Secrets.jsx');
  assert.match(page, /type="password"/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(page, /\.value = ''/);
  assert.equal(/localStorage|sessionStorage|console\./.test(page), false);
  assert.equal(/useState\([^\n]*(credential|secretValue|apiKey|accessToken)/i.test(page), false);
});

test('Secrets inventory is routed and authenticated through the in-memory partner client', () => {
  assert.match(read('src/App.jsx'), /path="\/secrets"/);
  assert.match(read('src/components/Sidebar.jsx'), /path: '\/secrets'/);
  assert.match(read('src/api/apiClient.js'), /path\.startsWith\('\/secrets'\)/);
});

test('Secrets UI contains replacement but no reveal or plaintext retrieval action', () => {
  const page = read('src/pages/Secrets.jsx');
  assert.match(page, /Replace credential/);
  assert.equal(/\/plaintext|\/reveal|revealSecret|exportSecret/.test(page), false);
});
