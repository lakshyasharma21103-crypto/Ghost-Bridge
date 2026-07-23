import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('Operations exposes all Phase 13E5 release pages and detail routes', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const navigation = read('src/components/ReleaseReadinessNav.jsx');
  for (const route of [
    '/operations/release-readiness',
    '/operations/release-candidates',
    '/operations/release-rollouts',
    '/operations/release-migrations',
    '/operations/release-feature-flags',
  ]) {
    assert.ok(app.includes(`path="${route}"`));
    assert.ok(navigation.includes(route));
  }
  assert.ok(app.includes('path="/operations/release-candidates/:candidateId"'));
  assert.ok(app.includes('path="/operations/release-rollouts/:rolloutId"'));
  for (const label of [
    'Release Readiness',
    'Release Candidates',
    'Rollouts',
    'Migrations',
    'Feature Flags',
  ]) assert.ok(sidebar.includes(`label: '${label}'`));
});

test('release readiness exposes every bounded checklist domain and honest manual boundary', () => {
  const source = read('src/pages/ReleaseReadiness.jsx');
  for (const label of [
    'Build',
    'Security',
    'Configuration',
    'Database',
    'Compatibility',
    'Runtime',
    'Performance',
    'Resilience',
    'Observability',
    'Operations',
    'Approvals',
  ]) assert.match(source, new RegExp(label));
  for (const label of [
    'Release readiness',
    'Source revision',
    'Test status',
    'Secret scan',
    'Compatibility',
    'Migration readiness',
    'Performance readiness',
    'Capacity readiness',
    'DR readiness',
    'SLO readiness',
    'Rollback readiness',
    'Manual gates',
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /remain manual/);
});

test('release inventories expose compact columns and guarded high-impact actions', () => {
  const candidates = read('src/pages/ReleaseCandidates.jsx');
  const rollouts = read('src/pages/ReleaseRollouts.jsx');
  const migrations = read('src/pages/ReleaseMigrations.jsx');
  const flags = read('src/pages/ReleaseFeatureFlags.jsx');
  for (const label of ['Candidate', 'Version', 'Source revision', 'Status', 'Validation', 'Risk', 'Migration', 'Compatibility', 'Performance', 'DR', 'Approval', 'Created']) assert.match(candidates, new RegExp(`label: '${label}'`));
  for (const label of ['Rollout', 'Candidate', 'Target', 'Strategy', 'Status', 'Stage', 'Health', 'Readiness', 'Migration', 'Canary', 'Rollback', 'Started']) assert.match(rollouts, new RegExp(`label: '${label}'`));
  for (const label of ['Migration', 'Release', 'Strategy', 'Status', 'Compatibility', 'Batch progress', 'Checkpoint', 'Rollback safety', 'Updated']) assert.match(migrations, new RegExp(`label: '${label}'`));
  for (const label of ['Key', 'Version', 'Scope', 'Status', 'Default', 'Rollout', 'Environment', 'Regions', 'Kill switch', 'Expires', 'Owner']) assert.match(flags, new RegExp(`label: '${label}'`));
  for (const action of ['Approve release', 'Begin production rollout', 'Pause rollout', 'Rollback', 'Roll-forward', 'Execute migration', 'Activate kill switch']) {
    assert.ok(`${candidates}${rollouts}${migrations}${flags}`.includes(action));
  }
  const inventory = read('src/components/ReleaseInventory.jsx');
  assert.match(inventory, /ConfirmationDialog/);
  assert.match(inventory, /Reason code/);
  assert.match(inventory, /Idempotency-Key/);
});

test('candidate and rollout details expose safe evidence sections without secret fields', () => {
  const candidate = read('src/pages/ReleaseCandidateDetail.jsx');
  const rollout = read('src/pages/ReleaseRolloutDetail.jsx');
  for (const section of ['Summary', 'Manifest', 'Provenance', 'Artifacts', 'Dependency Integrity', 'Compatibility', 'Migrations', 'Performance', 'Capacity', 'DR', 'SLOs', 'Runbooks', 'Manual Gates', 'Waivers', 'Evidence', 'Audit']) assert.match(candidate, new RegExp(section));
  for (const section of ['Canary percentage', 'Old and new version categories', 'Instance-version summary', 'Worker drain status', 'Queue safety status', 'Migration status', 'Health gates', 'Readiness gates', 'SLO gates', 'Performance gates', 'Observation window', 'Incident', 'Audit timeline']) assert.match(rollout, new RegExp(section));
  assert.doesNotMatch(`${candidate}${rollout}`, /environmentValue|connectionString|authorizationHeader|providerToken|databasePassword/);
});

test('release API calls are authenticated and never expose provider execution controls', () => {
  const api = read('src/api/apiClient.js');
  assert.match(api, /path\.startsWith\('\/releases'\)/);
  const sources = [
    read('src/pages/ReleaseReadiness.jsx'),
    read('src/components/ReleaseInventory.jsx'),
    read('src/pages/ReleaseCandidateDetail.jsx'),
    read('src/pages/ReleaseRolloutDetail.jsx'),
  ].join('\n');
  assert.match(sources, /workspaceId/);
  assert.doesNotMatch(sources, /cloudCredential|deploymentToken|sshKey|providerApi|setInstanceCount|changeAtlasTier|updateDns/);
});
