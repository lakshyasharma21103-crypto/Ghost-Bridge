import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = join(frontendRoot, 'src');

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), 'utf8');
}

function sourceFiles(directory) {
  return readdirSync(directory, { recursive: true })
    .filter((entry) => typeof entry === 'string' && /\.(?:js|jsx|mjs)$/.test(entry))
    .map((entry) => join(directory, entry));
}

test('the dashboard route map includes every Agent Passport Runtime Gateway page', () => {
  const app = read('src/App.jsx');
  const routes = [
    ['/', 'Landing'],
    ['/partner', 'PartnerDashboard'],
    ['/passports/new', 'CreatePassport'],
    ['/passports', 'PassportsList'],
    ['/passports/:passportId', 'PassportDetail'],
    ['/install-keys/issue', 'IssuePassportKey'],
    ['/install-keys/resolve', 'ResolvePassportKey'],
    ['/connections', 'Connections'],
    ['/connections/:connectionId', 'ConnectionDetail'],
    ['/invoke/test', 'TestInvocation'],
    ['/invocations', 'Invocations'],
    ['/audit', 'AuditLogs'],
    ['/settings', 'Settings'],
  ];

  for (const [path, component] of routes) {
    assert.match(
      app,
      new RegExp(`path="${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" element={<${component}`),
    );
  }
});

test('partner and receiving-platform UI flows call the expected gateway endpoints', () => {
  const createPassport = read('src/pages/CreatePassport.jsx');
  const issueKey = read('src/pages/IssuePassportKey.jsx');
  const resolveKey = read('src/pages/ResolvePassportKey.jsx');
  const testInvocation = read('src/pages/TestInvocation.jsx');

  assert.match(createPassport, /apiClient\.post\('\/passports\/validate'/);
  assert.match(createPassport, /apiClient\.post\('\/partner\/agents'/);
  assert.match(issueKey, /apiClient\.post\(`\/partner\/agents\/\$\{form\.passportId\}\/keys`/);
  assert.match(resolveKey, /apiClient\.post\('\/passports\/resolve'/);
  assert.match(testInvocation, /apiClient\.post\(`\/connections\/\$\{connectionId\}\/invoke`/);
  assert.match(testInvocation, /input: JSON\.parse\(input\),\s*\.\.\.identity/);
});

test('the install-key UI uses a copy-once component and does not retain the raw key after copying', () => {
  const issueKey = read('src/pages/IssuePassportKey.jsx');

  assert.match(issueKey, /<CopyOnceBox[\s\S]*value=\{issued\.key\}/);
  assert.match(issueKey, /setIssued\(\(current\) => \(\{ \.\.\.current, key: null \}\)\)/);
});

test('Developer Sandbox is backend-environment gated and loads seeded sandboxes in memory', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const sandbox = read('src/pages/DeveloperSandbox.jsx');

  assert.match(app, /sandboxReady[\s\S]*sandboxEnabled[\s\S]*<DeveloperSandbox/);
  assert.match(sidebar, /sandboxEnabled[\s\S]*Developer Sandbox/);
  assert.match(sandbox, /Development only .* do not use these credentials in production\./);
  assert.match(sandbox, /Use Existing Seeded Sandbox/);
  assert.match(sandbox, /type="password"/);
  assert.match(sandbox, /Load Sandbox/);
  assert.match(sandbox, /Forget Partner API Key/);
  assert.match(sandbox, /apiClient\.get\('\/partner\/agents', partnerAuthOptions\(apiKey\)\)/);
  assert.match(sandbox, /'X-Partner-Api-Key': apiKey/);
  assert.match(sandbox, /item\.partnerAgentId === SANDBOX_PARTNER_AGENT_ID/);
  assert.match(sandbox, /data\.partner\.slug !== requestedSlug/);
  assert.match(sandbox, /apiClient\.post\('\/developer-sandbox\/partners'/);
  assert.match(sandbox, /developer-sandbox\/partners\/\$\{state\.partner\.id\}\/passport/);
  assert.match(sandbox, /developer-sandbox\/passports\/\$\{state\.passport\.passportId\}\/keys/);
  assert.match(sandbox, /partnerApiKey: ''/);
  assert.match(sandbox, /state\.passport\?\.status === 'valid'/);
  assert.match(sandbox, /External Agent Integration/);
  assert.match(sandbox, /Check External Agent Health/);
  assert.match(sandbox, /Create or Update External Agent Passport/);
  assert.match(sandbox, /Issue External Agent Install Key/);
  assert.match(sandbox, /Continue to Resolve Key/);
  assert.match(sandbox, /\/developer-sandbox\/external-agent\/health/);
  assert.match(sandbox, /\/developer-sandbox\/external-agent\/passport/);
  assert.match(sandbox, /\/developer-sandbox\/external-agent\/install-key/);
  assert.doesNotMatch(sandbox, /EXTERNAL_TEST_AGENT_RUNTIME_TOKEN|runtimeToken|accessToken/);
  assert.match(sandbox, /installKey: \{ \.\.\.current\.installKey, key: null \}/);
  assert.doesNotMatch(sandbox, /localStorage|sessionStorage|document\.cookie/);
});

test('frontend source contains no legacy product references', () => {
  const source = sourceFiles(sourceRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(
    source,
    /Ghost Bridge|GhostBridge|agent network|workflow builder|workflow canvas|\bn8n\b/i,
  );
});
