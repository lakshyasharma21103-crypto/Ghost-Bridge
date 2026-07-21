import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('console exposes recovery policy and intervention routes under orchestration navigation', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  for (const route of [
    '/recovery-policies',
    '/recovery-policies/:policyId',
    '/interventions',
    '/interventions/:interventionId',
  ]) {
    assert.ok(app.includes(`path="${route}"`), `missing ${route}`);
  }
  assert.match(sidebar, /label: 'Orchestrations'/);
  assert.match(sidebar, /label: 'Recovery Policies'/);
  assert.match(sidebar, /label: 'Interventions'/);
  assert.ok(
    sidebar.indexOf("label: 'Orchestrations'") < sidebar.indexOf("label: 'Recovery Policies'") &&
      sidebar.indexOf("label: 'Recovery Policies'") < sidebar.indexOf("label: 'Interventions'"),
    'recovery links should remain grouped directly after Orchestrations',
  );
});

test('recovery policy console uses the tenant-scoped lifecycle API and fixed policy fields', () => {
  const list = read('src/pages/RecoveryPolicies.jsx');
  const detail = read('src/pages/RecoveryPolicyDetail.jsx');
  const definition = read('src/pages/OrchestrationDefinition.jsx');
  assert.match(list, /apiClient\.get\(`\/orchestration-recovery\/policies\?\$\{query\}`\)/);
  assert.match(list, /apiClient\.post\('\/orchestration-recovery\/policies'/);
  assert.match(detail, /apiClient\.get\(`\/orchestration-recovery\/policies\/\$\{policyId\}\?\$\{query\}`\)/);
  assert.match(detail, /apiClient\.patch\(`\/orchestration-recovery\/policies\/\$\{policyId\}`/);
  for (const lifecycle of ['validate', 'activate', 'archive']) {
    assert.ok(detail.includes(`lifecycle('${lifecycle}')`), `missing ${lifecycle} control`);
  }
  for (const field of [
    'defaultFailureStrategy',
    'maximumRecoveryAttempts',
    'maximumCompensationAttempts',
    'recoveryDeadlineMs',
    'compensationDeadlineMs',
    'permittedFailureCategories',
    'nonRecoverableFailureCategories',
    'automaticCompensation',
    'compensationOrdering',
    'maximumParallelCompensations',
  ]) {
    assert.match(list + detail, new RegExp(field));
  }
  assert.match(definition, /\/orchestration-recovery\/policies/);
  assert.match(definition, /recoveryPolicyId/);
  assert.match(definition, /recoveryPolicyVersion/);
  assert.doesNotMatch(list + detail, /eval\(|new Function|dangerouslySetInnerHTML/);
});

test('intervention and run recovery views call the deterministic D4 API surface', () => {
  const list = read('src/pages/Interventions.jsx');
  const detail = read('src/pages/InterventionDetail.jsx');
  const run = read('src/pages/OrchestrationRunDetail.jsx');
  assert.match(list, /apiClient\.get\(`\/orchestration-interventions\?\$\{query\}`\)/);
  assert.match(detail, /apiClient\.get\(`\/orchestration-interventions\/\$\{interventionId\}\?\$\{query\}`\)/);
  assert.match(detail, /`\/orchestration-interventions\/\$\{interventionId\}\/resolve`/);
  assert.match(run, /`\/orchestrations\/runs\/\$\{runId\}\/recovery\?\$\{query\}`/);
  assert.match(run, /`\/orchestrations\/runs\/\$\{runId\}\/checkpoints\?\$\{query\}`/);
  assert.match(run, /`\/orchestrations\/runs\/\$\{runId\}\/nodes\/\$\{recoveryAction\.nodeRunId\}\/\$\{recoveryAction\.kind\.replaceAll\('_', '-'\)\}`/);
  assert.match(run, /`\/orchestrations\/runs\/\$\{runId\}\/recovery\/\$\{recoveryAction\.kind\}`/);
  for (const action of ['retry', 'skip', 'correct_input', 'replace_agent', 'compensate', 'waive_compensation', 'terminate']) {
    assert.match(run, new RegExp(`\\b${action}\\b`));
  }
  for (const field of ['safeSummary', 'safeFailureCategory', 'compensationAvailable', 'recoveryAttemptCount', 'classification', 'affectedAgent', 'approvalStatus', 'traceId', 'requestId', 'auditTimeline']) {
    assert.match(detail, new RegExp(field));
  }
});

test('recovery controls render only server-advertised actions explicitly marked allowed', () => {
  const run = read('src/pages/OrchestrationRunDetail.jsx');
  const intervention = read('src/pages/InterventionDetail.jsx');
  const policy = read('src/pages/RecoveryPolicyDetail.jsx');
  assert.match(run, /value\.allowed === true/);
  assert.match(run, /if \(!entry\) return \[\]/);
  assert.match(run, /recovery\.nodeActionsById/);
  assert.match(intervention, /entry\.allowed !== true/);
  assert.match(policy, /value\.allowed === true/);
  for (const source of [run, intervention, policy]) {
    assert.match(source, /availableActions/);
    assert.doesNotMatch(source, /\ballowedActions\b/);
  }
});

test('recovery action dialog creates one key per open action and reuses it for submission', () => {
  const dialog = read('src/components/RecoveryActionDialog.jsx');
  const run = read('src/pages/OrchestrationRunDetail.jsx');
  const intervention = read('src/pages/InterventionDetail.jsx');
  assert.equal(dialog.match(/crypto\.randomUUID\(\)/g)?.length, 1);
  assert.match(dialog, /if \(!open \|\| !action\) return;/);
  assert.match(dialog, /setIdempotencyKey\(`recovery_\$\{crypto\.randomUUID\(\)\}`\)/);
  assert.match(dialog, /onConfirm\(\{ body: payload, idempotencyKey \}\)/);
  const confirmFunction = dialog.slice(dialog.indexOf('function confirm()'), dialog.indexOf('return ('));
  assert.doesNotMatch(confirmFunction, /randomUUID/);
  assert.match(run, /'Idempotency-Key': idempotencyKey/);
  assert.match(intervention, /'Idempotency-Key': idempotencyKey/);
  assert.match(dialog, /SAFE_REASON_PATTERN/);
});

test('recovery pages expose only explicit safe metadata fields', () => {
  const sources = [
    'src/components/RecoveryActionDialog.jsx',
    'src/pages/RecoveryPolicies.jsx',
    'src/pages/RecoveryPolicyDetail.jsx',
    'src/pages/Interventions.jsx',
    'src/pages/InterventionDetail.jsx',
    'src/pages/OrchestrationRunDetail.jsx',
  ].map(read).join('\n');
  assert.doesNotMatch(
    sources,
    /runtimeCredentials|providerApiKey|installKey|authorizationHeader|encryptedDelegated|delegationReference|systemPrompt|privateMemory|hiddenReasoning|chainOfThought|rawPayload|unrestrictedPayload|privatePolicyRules/i,
  );
  assert.doesNotMatch(sources, /JSON\.stringify\((?:item|recovery|event|currentFailure|intervention)\b/);
  assert.doesNotMatch(sources, /dangerouslySetInnerHTML|eval\(|new Function/);
});

test('API client authenticates both new recovery control prefixes', () => {
  const api = read('src/api/apiClient.js');
  assert.match(api, /path\.startsWith\('\/orchestration-recovery'\)/);
  assert.match(api, /path\.startsWith\('\/orchestration-interventions'\)/);
});
