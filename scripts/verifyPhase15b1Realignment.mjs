import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  docsManifest,
  findPublicPage,
  navigationGroups,
  protocolProfile,
  registryAgents,
  legacyPublicRedirects,
} from '../frontend/src/docs/docsManifest.js';
import {
  searchDocumentation,
  validateDocumentationManifest,
} from '../frontend/src/docs/docsEngine.js';
import core from '../packages/ghostbridge-protocol-core/src/index.js';
import conformance from '../packages/ghostbridge-conformance/src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

assert.equal(core.DEFAULT_PROFILE_DECLARATIONS.core.id, 'ghostbridge.core');
assert.deepEqual(core.DEFAULT_PROFILE_DECLARATIONS.core.conformance, ['C1', 'C2', 'C3']);
assert.deepEqual(
  core.DEFAULT_PROFILE_DECLARATIONS.governedExecution.conformance,
  ['G1', 'G2', 'G3'],
);
assert.equal(core.DEFAULT_PROFILE_DECLARATIONS.agentCoordination.status, 'deferred');
assert.equal(core.DEFAULT_PROFILE_DECLARATIONS.agentCoordination.supported, false);
pass('explicit Core, Governed Execution, and deferred Agent Coordination profiles');

assert.doesNotMatch(JSON.stringify(conformance.CONFORMANCE_PROFILES.Core), /delegation/i);
assert.doesNotMatch(
  JSON.stringify(conformance.CONFORMANCE_PROFILES['Governed Execution']),
  /delegation/i,
);
for (const level of ['C1', 'C2', 'C3', 'G1', 'G2', 'G3']) {
  assert.match(JSON.stringify(conformance.CONFORMANCE_PROFILES), new RegExp(level));
}
pass('profile-based conformance does not require agent coordination');

validateDocumentationManifest(docsManifest);
assert.deepEqual(navigationGroups().slice(0, 5).map(({ label }) => label), [
  'Get Started',
  'Learn',
  'Build with Ghost Bridge',
  'Governed Execution',
  'Reference',
]);
assert.equal(findPublicPage('/docs/develop/build-host').category, 'Build with Ghost Bridge');
for (const route of [
  '/docs/get-started/add-external-agent',
  '/docs/develop/publish-agent-compatibility',
  '/docs/governed/overview',
  '/docs/reference/profiles',
  '/docs/reference/standard-errors',
]) {
  assert.ok(findPublicPage(route), `Missing ${route}`);
}
assert.equal(
  findPublicPage('/docs/experimental/agent-coordination').category,
  'Future and Experimental',
);
assert.equal(protocolProfile.agentCoordinationProfile, 'Experimental/Deferred');
assert.equal(legacyPublicRedirects['/docs/develop/build-client'], '/docs/develop/build-host');
assert.equal(legacyPublicRedirects['/docs/build/client'], '/docs/develop/build-host');
pass('public navigation and documentation hierarchy');

const homepage = read('frontend/src/pages/ProtocolHome.jsx');
assert.match(homepage, /Host Application[\s\S]*External Agent/);
assert.match(homepage, /Core · Active/);
assert.match(homepage, /Governed Execution · Active/);
assert.match(homepage, /Agent Coordination · Experimental\/Deferred/);
assert.ok(homepage.indexOf('Universal lifecycle') < homepage.indexOf('title="Agent Coordination'));
pass('homepage leads with Host Application to External Agent');

const search = searchDocumentation('cross-company external agent integration');
assert.ok(search.length > 0);
assert.ok([
  '/docs/get-started/what-is-ghost-bridge',
  '/docs/get-started/quickstart',
  '/docs/develop/build-host',
].includes(search[0].route));
pass('search and Ask source rank universal integration guidance');

for (const agent of registryAgents) {
  assert.ok(agent.profiles.length);
  assert.ok(agent.authenticationModes.length);
  assert.equal(agent.taskSupport, true);
  assert.equal(agent.receiptSupport, true);
}
assert.doesNotMatch(JSON.stringify(registryAgents), /runtimeToken|accessToken|baseUrl/i);
pass('Registry compatibility projection');

const inspector = read('packages/ghostbridge-inspector/src/index.js');
assert.ok(inspector.indexOf("'Profiles'") < inspector.indexOf("'Experimental: Agent Coordination'"));
assert.ok(inspector.indexOf("'Install Preview'") < inspector.indexOf("'Experimental: Agent Coordination'"));
pass('Inspector host-agent tab priority');

assert.match(read('protocol/specification/0.1-draft/profiles.md'), /Core[\s\S]*C1[\s\S]*C3/);
assert.match(read('protocol/specification/0.1-draft/conformance.md'), /G1[\s\S]*G3/);
assert.match(read('protocol/specification/0.1-draft/delegation.md'), /Experimental\/Deferred/);
pass('normative profile and experimental coordination status');

const migrationChanges = execFileSync(
  'git',
  ['diff', '--name-only', '--', 'backend/scripts/migrate*.js'],
  { cwd: root, encoding: 'utf8' },
).trim();
assert.equal(migrationChanges, '');
pass('historical migration files unchanged');

const mcpAdapter = read('backend/src/services/adapters/mcp.adapter.js');
assert.match(mcpAdapter, /quarantin|disabled|MCP/i);
assert.doesNotMatch(read('protocol/examples/flowdesk-host/src/index.js'), /codeforge|ledgerworks/i);
assert.doesNotMatch(read('protocol/examples/governed-host-agent/opscanvas-host.js'), /ledgerworks|native-agent/i);
pass('MCP quarantine and provider-independent host boundaries');

assert.equal(fs.existsSync(path.join(root, 'docs/engineering/phase-15b1-realignment-inventory.md')), true);
assert.equal(fs.existsSync(path.join(root, 'docs/PHASE_15B1_COMPLETION_REPORT.md')), true);
pass('safe realignment inventory and completion report retained');

pass('Phase 15B.1 realignment');
