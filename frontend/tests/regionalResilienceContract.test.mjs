import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('Operations exposes every Phase 13E3 regional resilience page', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const navigation = read('src/components/RegionalResilienceNav.jsx');
  for (const route of ['/operations/regions', '/operations/failover', '/operations/disaster-recovery', '/operations/backups-restores', '/operations/dr-drills']) {
    assert.ok(app.includes(`path="${route}"`));
    assert.ok(navigation.includes(route));
  }
  for (const label of ['Regions', 'Failover', 'Disaster Recovery', 'Backups & Restores', 'DR Drills']) assert.ok(sidebar.includes(`label: '${label}'`));
});

test('regions view exposes authority, health, readiness, objectives, and bounded region inventory', () => {
  const source = read('src/pages/Regions.jsx');
  for (const label of ['Active write region', 'Regional health', 'Replication health', 'Failover readiness', 'RPO status', 'RTO status', 'Write Authority']) assert.match(source, new RegExp(label));
  for (const field of ['authorityEpoch', 'serviceHealthCategory', 'databaseHealthCategory', 'replicationHealthCategory', 'activeWorkerCount', 'queuedWorkCategory']) assert.match(source, new RegExp(field));
  assert.doesNotMatch(source, /leaseId|privateHostname|databaseUri|connectionString/);
});

test('failover controls require confirmation and display safe source, target, reason, and approval context', () => {
  const source = read('src/pages/RegionalFailover.jsx');
  assert.match(source, /ConfirmationDialog/);
  assert.match(source, /safeReasonCode/);
  assert.match(source, /Approval status/);
  assert.match(source, /Plan switchover/);
  assert.match(source, /Request emergency failover/);
  assert.match(source, /Request failback/);
  assert.match(source, /orderedSteps/);
  assert.match(source, /queueOwnershipTransferred/);
  assert.match(source, /cacheInvalidated/);
  assert.match(source, /projectionsRecovered/);
  assert.match(source, /sourceFenceConfirmed/);
  assert.match(source, /acceptPotentialDataLoss/);
  assert.doesNotMatch(source, /approvalSatisfied|approval-\$\{crypto\.randomUUID/);
});

test('DR policy editor covers objectives, residency, replication, approval, degraded mode, backup, and health', () => {
  const source = read('src/pages/DisasterRecovery.jsx');
  for (const field of ['criticality', 'recoveryPointObjectiveMs', 'recoveryTimeObjectiveMs', 'permittedRecoveryRegionIds', 'prohibitedRecoveryRegionIds', 'maximumPromotionReplicationLagMs', 'requireApprovalForFailover', 'requireApprovalForFailback', 'requireApprovalForDataLossAcceptance', 'degradedMode', 'backupFrequencyMs', 'backupRetentionMs', 'restoreVerificationFrequencyMs', 'minimumHealthyServiceCount', 'minimumHealthyWorkerCount', 'minimumHealthyDatabaseCategory']) assert.match(source, new RegExp(field));
  assert.match(source, /validate/);
  assert.match(source, /activate/);
});

test('backup and restore UI exposes safe inventory and isolated validation safeguards', () => {
  const source = read('src/pages/BackupsRestores.jsx');
  for (const phrase of ['Request backup', 'Verify backup', 'Request isolated restore', 'Validate restore', 'Promote validated restore', 'Clean up']) assert.match(source, new RegExp(phrase));
  for (const field of ['recoverableThrough', 'verificationStatus', 'schemaVersion', 'migrationStatus', 'indexStatus', 'integrityStatus', 'projectionStatus', 'approvalRequestId']) assert.match(source, new RegExp(field));
  assert.doesNotMatch(source, /signedUrl|backupCredential|restoreCredential|providerToken|privateHost/);
  assert.doesNotMatch(source, /approvalSatisfied|approval-\$\{crypto\.randomUUID/);
});

test('DR drill view restricts scheduled automation to deterministic simulation', () => {
  const source = read('src/pages/DrDrills.jsx');
  assert.match(source, /deterministic_simulation/);
  assert.match(source, /Schedule drill/);
  assert.match(source, /Run drill/);
  for (const field of ['expectedRpoMs', 'measuredRpoMs', 'expectedRtoMs', 'measuredRtoMs', 'safeFindings']) assert.match(source, new RegExp(field));
});

test('API client authenticates every regional resilience request', () => {
  assert.match(read('src/api/apiClient.js'), /path\.startsWith\('\/regional-resilience'\)/);
});
