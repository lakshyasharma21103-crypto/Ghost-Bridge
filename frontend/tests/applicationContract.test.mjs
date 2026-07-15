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
    ['/operations', 'Operations'],
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

test('Operations uses tenant-scoped aggregate APIs and renders only safe operational fields', () => {
  const operations = read('src/pages/Operations.jsx');

  assert.match(operations, /\/operations\/summary/);
  assert.match(operations, /\/operations\/latency/);
  assert.match(operations, /\/operations\/errors/);
  assert.match(operations, /\/operations\/passport-funnel/);
  assert.match(operations, /\/operations\/alerts/);
  assert.match(operations, /\/operations\/recovery\?/);
  assert.match(operations, /apiClient\.post\('\/operations\/recovery\/scan'/);
  assert.match(operations, /receivingWorkspaceId/);
  assert.match(operations, /No active operational alerts\./);
  assert.match(operations, /No failed invocations for this window\./);
  assert.match(operations, /Recovery required/);
  assert.match(operations, /External attempts/);
  assert.match(operations, /Repeated transient failures/);
  assert.match(operations, /Recent failed or ambiguous invocations/);
  assert.match(operations, /attemptCount/);
  assert.match(operations, /retryDecision/);
  assert.match(operations, /recovery_required/);
  assert.match(operations, /Cancellation requested/);
  assert.match(operations, /Confirmed cancelled/);
  assert.match(operations, /Cancellation outcome unknown/);
  assert.match(operations, /Stuck invocations detected/);
  assert.match(operations, /Manually retried/);
  assert.match(operations, /Manually resolved/);
  assert.match(operations, /Retry denied/);
  assert.match(operations, /Recovery review queue/);
  assert.match(operations, /No invocations currently require recovery review\./);
  assert.match(operations, /\/invocations\?invocationId=/);
  assert.match(operations, /<ConfirmationDialog/);
  assert.match(
    operations,
    /const loadOperations = useCallback\(async \(\) => \{\s*if \(!partnerConfigured\) \{[\s\S]*?return;\s*\}[\s\S]*?apiClient\.get/,
  );
  assert.match(
    operations,
    /async function acknowledge\(alertId\) \{\s*if \(!partnerConfigured\) return false;/,
  );
  assert.match(
    operations,
    /async function runRecoveryScan\(\) \{\s*if \(!partnerConfigured\) return;/,
  );
  assert.match(operations, /disabled=\{state\.loading \|\| !partnerConfigured\}/);
  assert.doesNotMatch(
    operations,
    /inputSummary|\.output\b|sourceUrl|Authorization|encryptedPayload|accessToken|installKey|apiKey|idempotencyKeyHash/,
  );
});

test('invocation detail exposes only safe lifecycle controls and confirms every state change', () => {
  const invocations = read('src/pages/Invocations.jsx');
  const confirmation = read('src/components/ConfirmationDialog.jsx');

  assert.match(invocations, /useSearchParams/);
  assert.match(invocations, /searchParams\.get\('invocationId'\)/);
  assert.match(invocations, /\/invocations\/\$\{invocationId\}\/attempts/);
  assert.match(invocations, /\/invocations\/\$\{invocationId\}\/\$\{request\.endpoint\}/);
  assert.match(invocations, /endpoint: 'cancel'/);
  assert.match(invocations, /endpoint: 'retry'/);
  assert.match(invocations, /endpoint: 'resolve'/);
  assert.match(invocations, /availableActions/);
  assert.match(invocations, /partnerConfigured/);
  assert.match(invocations, /Cancellation requested; remote termination is not confirmed\./);
  assert.match(invocations, /Retry is blocked because the remote outcome is unknown\./);
  assert.match(invocations, /This invocation requires operator review\./);
  assert.match(invocations, /<ConfirmationDialog/);
  assert.match(
    invocations,
    /const load = useCallback\(async \(\) => \{\s*if \(!partnerConfigured\) \{[\s\S]*?return;\s*\}[\s\S]*?apiClient\.get/,
  );
  assert.match(
    invocations,
    /if \(!partnerConfigured \|\| !invocationId\) \{[\s\S]*?return;\s*\}[\s\S]*?apiClient\.get/,
  );
  assert.match(
    invocations,
    /async function runControlAction\(\) \{\s*if \(!partnerConfigured \|\| !confirmation/,
  );
  assert.doesNotMatch(
    invocations,
    /item\.output|JSON\.stringify\(item\.error|inputSummary|sourceUrl|Authorization|encryptedPayload|accessToken|installKey|apiKey|idempotencyKeyHash/,
  );

  assert.match(confirmation, /role="dialog"/);
  assert.match(confirmation, /aria-modal="true"/);
  assert.match(confirmation, /event\.key === 'Escape'/);
  assert.match(confirmation, /cancelButtonRef\.current\?\.focus/);
});

test('the API client authenticates Phase 13B3 operator paths and allowlists control errors', () => {
  const apiClient = read('src/api/apiClient.js');

  assert.match(apiClient, /function isPhase13B3Control/);
  assert.match(apiClient, /pathname\.startsWith\('\/operations\/'\)/);
  assert.match(apiClient, /pathname\.startsWith\('\/audit-logs\/'\)/);
  assert.match(apiClient, /\^\\\/invocations/);
  assert.match(apiClient, /cancel\|retry\|resolve/);
  assert.match(apiClient, /isPhase13B3Control\(path, options\.method\)/);
  assert.match(apiClient, /X-Partner-Api-Key/);
  assert.match(apiClient, /PARTNER_API_KEY_REQUIRED/);
  assert.match(apiClient, /SAFE_CANCELLATION_STATES/);
  assert.match(apiClient, /SAFE_RECOVERY_DECISIONS/);
  assert.match(apiClient, /reasonCode: safeCode/);
  assert.doesNotMatch(apiClient, /Object\.assign\([^)]*error|\.\.\.error[,}]/);
});

test('Audit Logs suppresses protected reads until a Partner key is configured', () => {
  const auditLogs = read('src/pages/AuditLogs.jsx');

  assert.match(
    auditLogs,
    /const loadLogs = useCallback\(\(\) => \{\s*if \(!partnerConfigured\) \{[\s\S]*?return undefined;\s*\}[\s\S]*?apiClient\s*\.get\(`\/audit-logs/,
  );
  assert.match(auditLogs, /disabled=\{state\.loading \|\| !partnerConfigured\}/);
  assert.match(auditLogs, /Configure a Partner API key in Settings/);
});

test('the overview does not request protected invocation or audit history without Partner access', () => {
  const landing = read('src/pages/Landing.jsx');

  assert.match(
    landing,
    /partnerConfigured \? apiClient\.get\(`\/invocations\?\$\{query\}`\) : Promise\.resolve\(null\)/,
  );
  assert.match(
    landing,
    /partnerConfigured \? apiClient\.get\(`\/audit-logs\?\$\{query\}`\) : Promise\.resolve\(null\)/,
  );
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
