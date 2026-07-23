import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relative) => fs.readFileSync(path.resolve(root, relative), 'utf8');

test('staging and pilot pages extend the compact operations console', () => {
  const app = source('src/App.jsx');
  const sidebar = source('src/components/Sidebar.jsx');
  const consolePage = source('src/pages/StagingPilotConsole.jsx');
  const api = source('src/api/apiClient.js');
  for (const route of [
    '/operations/staging', '/operations/pilot-programs', '/operations/capability-gates',
    '/operations/pilot-health', '/operations/pilot-feedback-support',
  ]) {
    assert.match(app, new RegExp(route.replaceAll('/', '\\/')));
  }
  for (const label of ['Staging', 'Pilot Programs', 'Capability Gates', 'Pilot Health', 'Feedback & Support']) {
    assert.match(sidebar, new RegExp(label.replace('&', '\\&')));
  }
  assert.match(consolePage, /external\.grounded_research/);
  assert.match(consolePage, /provider unavailable/);
  assert.match(consolePage, /Real staging deployment remains manual or external/);
  assert.match(api, /path\.startsWith\('\/launch'\)/);
  assert.doesNotMatch(consolePage, /rawPrompt|rawResponse|authorizationHeader|runtimeToken/);
});
