import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('GA commercial console preserves compact governed views and blocked grounded research', async () => {
  const [app, sidebar, page, api] = await Promise.all([
    readFile(new URL('src/App.jsx', root), 'utf8'),
    readFile(new URL('src/components/Sidebar.jsx', root), 'utf8'),
    readFile(new URL('src/pages/CommercialConsole.jsx', root), 'utf8'),
    readFile(new URL('src/api/apiClient.js', root), 'utf8'),
  ]);
  for (const path of [
    '/commercial/products', '/commercial/plans', '/commercial/entitlements', '/commercial/customers',
    '/commercial/subscriptions', '/commercial/usage', '/commercial/invoices', '/commercial/payments',
    '/commercial/renewals', '/commercial/customer-success',
    '/ga/readiness', '/ga/rollouts', '/ga/decisions', '/ga/evidence',
  ]) assert.match(app, new RegExp(path.replaceAll('/', '\\/')));
  assert.match(sidebar, /Commercial/);
  assert.match(sidebar, /General Availability/);
  assert.match(page, /external\.grounded_research/);
  assert.match(page, /ready_with_restrictions/);
  assert.match(page, /integer minor units/);
  assert.match(page, /Product analytics projections are never invoice authority/);
  assert.match(api, /path\.startsWith\('\/commercial'\)/);
  assert.match(api, /path\.startsWith\('\/ga'\)/);
});
