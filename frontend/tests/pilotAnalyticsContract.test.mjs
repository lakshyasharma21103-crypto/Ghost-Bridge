import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relative) => fs.readFileSync(path.resolve(root, relative), 'utf8');

test('pilot analytics extends the compact operations console with all governed views', () => {
  const app = source('src/App.jsx');
  const sidebar = source('src/components/Sidebar.jsx');
  const page = source('src/pages/PilotAnalyticsConsole.jsx');
  const navigation = source('src/components/PilotAnalyticsNav.jsx');
  const api = source('src/api/apiClient.js');
  for (const route of [
    '/operations/pilot-analytics',
    '/operations/pilot-analytics/funnels',
    '/operations/pilot-analytics/cohorts',
    '/operations/pilot-analytics/capabilities',
    '/operations/pilot-analytics/feedback',
    '/operations/pilot-analytics/experiments',
    '/operations/pilot-analytics/opportunities',
    '/operations/pilot-analytics/data-quality',
  ]) assert.match(app, new RegExp(route.replaceAll('/', '\\/')));
  for (const label of ['Pilot Analytics', 'Adoption Funnels', 'Cohorts & Retention', 'Feedback Insights', 'Experiments', 'Product Opportunities']) {
    assert.match(sidebar, new RegExp(label.replace('&', '\\&')));
    assert.match(navigation, new RegExp(label.replace('&', '\\&')));
  }
  assert.match(page, /Reporting window/);
  assert.match(page, /Denominator/);
  assert.match(page, /external\.grounded_research remains disabled/);
  assert.match(page, /provider-blocked activity, not abandonment/);
  assert.match(page, /Assignment is not exposure or authorization/);
  assert.match(api, /path\.startsWith\('\/pilot-analytics'\)/);
  assert.doesNotMatch(page, /authorizationHeader|runtimeToken|installKey|providerApiKey|customerPayload/);
});
