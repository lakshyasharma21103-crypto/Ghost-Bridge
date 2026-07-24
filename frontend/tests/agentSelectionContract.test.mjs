import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('console exposes discovery, selection policy and decision routes', () => {
  const app = read('src/App.jsx');
  for (const route of ['/agent-discovery', '/selection-policies', '/selection-decisions']) assert.match(app, new RegExp(route));
  const sidebar = read('src/components/Sidebar.jsx');
  for (const label of ['Native Agents', 'Selection Policies', 'Selection Decisions']) assert.match(sidebar, new RegExp(label));
});

test('agent discovery exposes bounded safe filters and columns', () => {
  const page = read('src/pages/AgentDiscovery.jsx');
  for (const filter of ['capability', 'operation', 'trustTier', 'publisher', 'region', 'health', 'readiness', 'costClass', 'latencyClass']) assert.match(page, new RegExp(filter));
  assert.doesNotMatch(page, /credential|bearer|install.?key|provider.?key/i);
});

test('safe agent detail includes schemas without runtime authentication', () => {
  const page = read('src/pages/AgentDetail.jsx');
  assert.match(page, /inputSchema/); assert.match(page, /outputSchema/); assert.match(page, /residencyRegions/);
  assert.doesNotMatch(page, /runtimeEndpoint|credential|authorization/i);
});

test('selection policy editor exposes fixed fields and no expression evaluator', () => {
  const pages = read('src/pages/SelectionPolicies.jsx') + read('src/pages/SelectionPolicyDetail.jsx');
  for (const field of ['scoreWeights', 'minimumTrustTier', 'maximumCostClass', 'requireHealthy', 'requireApprovalWhen']) assert.match(pages, new RegExp(field));
  assert.doesNotMatch(pages, /eval\(|new Function|dangerouslySetInnerHTML/);
});

test('selection decision views show safe reasons, aggregate exclusions and fallbacks', () => {
  const pages = read('src/pages/SelectionDecisions.jsx') + read('src/pages/SelectionDecisionDetail.jsx');
  assert.match(pages, /reasons/); assert.match(pages, /excluded/); assert.match(pages, /fallbackCandidates/); assert.match(pages, /healthSnapshotAt/);
  assert.doesNotMatch(pages, /rawPolicy|policySource|hiddenReasoning/);
});

test('orchestration editor presents pinned and governed target metadata', () => {
  const definitions = read('src/pages/Orchestrations.jsx') + read('src/pages/OrchestrationDefinition.jsx');
  assert.match(definitions, /targetingMode/); assert.match(definitions, /governed_selection/); assert.match(definitions, /selectionPolicyId/);
});

test('API client authenticates discovery and selection routes', () => {
  const api = read('src/api/apiClient.js');
  assert.match(api, /path\.startsWith\('\/agent-discovery'\)/);
  assert.match(api, /path\.startsWith\('\/agent-selection'\)/);
});
