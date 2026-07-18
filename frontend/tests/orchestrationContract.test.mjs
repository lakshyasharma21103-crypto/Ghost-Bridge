import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('console exposes compact orchestration definition and run routes', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  for (const route of [
    '/orchestrations',
    '/orchestrations/definitions/:definitionId',
    '/orchestrations/runs',
    '/orchestrations/runs/:runId',
  ]) assert.ok(app.includes(`path="${route}"`));
  assert.match(sidebar, /label: 'Orchestrations'/);
});

test('orchestration UI calls the tenant-scoped API surface', () => {
  const definitions = read('src/pages/Orchestrations.jsx');
  const detail = read('src/pages/OrchestrationDefinition.jsx');
  const runs = read('src/pages/OrchestrationRuns.jsx');
  const runDetail = read('src/pages/OrchestrationRunDetail.jsx');
  assert.match(definitions, /\/orchestrations\/definitions/);
  assert.match(detail, /action\('validate', 'validate'\)/);
  assert.match(detail, /action\('activate', 'activate'\)/);
  assert.match(detail, /action\('archive', 'archive'\)/);
  assert.match(detail, /\/runs/);
  assert.match(runs, /\/orchestrations\/runs/);
  assert.match(runDetail, /\/nodes/);
  assert.match(runDetail, /\/cancel/);
  for (const source of [definitions, detail, runs, runDetail]) {
    assert.match(source, /workspaceId|receivingWorkspaceId/);
  }
});

test('run detail renders summaries and safe failures but no raw node payloads', () => {
  const source = read('src/pages/OrchestrationRunDetail.jsx');
  assert.match(source, /Safe input summary/);
  assert.match(source, /safeFailure/);
  assert.match(source, /traceId/);
  assert.match(source, /<ConfirmationDialog/);
  assert.doesNotMatch(
    source,
    /resolvedInput|validatedOutput|encrypted|authorization|runtimeToken|installKey|apiKey|credentialId/,
  );
});

test('API client requires partner authentication for orchestration requests', () => {
  const source = read('src/api/apiClient.js');
  assert.match(source, /path\.startsWith\('\/orchestrations'\)/);
});
