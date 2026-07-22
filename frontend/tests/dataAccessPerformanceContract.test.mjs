import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('Operations exposes all compact Phase 13E2 pages', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const navigation = read('src/components/DataPerformanceNav.jsx');
  for (const route of [
    '/operations/database-cache',
    '/operations/query-performance',
    '/operations/database-indexes',
    '/operations/data-projections',
  ]) {
    assert.ok(app.includes(`path="${route}"`));
    assert.ok(navigation.includes(route));
  }
  for (const label of ['Database & Cache', 'Query Performance', 'Indexes', 'Projections']) {
    assert.ok(sidebar.includes(`label: '${label}'`));
  }
});

test('database and cache page shows categories and namespaces but never cache values', () => {
  const source = read('src/pages/DatabaseCache.jsx');
  assert.match(source, /poolUsageCategory/);
  assert.match(source, /hitRateCategory/);
  assert.match(source, /invalidationLagCategory/);
  assert.match(source, /Performance policy editor/);
  assert.doesNotMatch(source, /cachedValue|rawCacheValue|authorizationHeader|redisUrl|mongodbUri/);
});

test('query diagnostics and indexes avoid raw query content and index deletion', () => {
  const queries = read('src/pages/QueryPerformance.jsx');
  const indexes = read('src/pages/DatabaseIndexes.jsx');
  assert.match(queries, /queryShapeId/);
  assert.match(queries, /examinationRatioCategory/);
  assert.doesNotMatch(queries, /rawFilter|searchText|fullQueryPlan/);
  assert.match(indexes, /No indexes will be dropped/);
  assert.doesNotMatch(indexes, /dropIndex|deleteIndex|flush all/i);
});

test('projection controls are scoped and mutations carry idempotency keys', () => {
  const source = read('src/pages/DataProjections.jsx');
  assert.match(source, /workspaceId/);
  assert.match(source, /Idempotency-Key/);
  assert.match(source, /rebuild/);
  assert.match(source, /pause/);
  assert.match(source, /resume/);
});

test('API client requires partner authentication for data-performance requests', () => {
  const source = read('src/api/apiClient.js');
  assert.match(source, /path\.startsWith\('\/data-performance'\)/);
});
