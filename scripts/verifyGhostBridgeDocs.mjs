import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  askGhostBridge,
  generateLlmsFullText,
  generateLlmsText,
  groupSearchResults,
  pageToMarkdown,
  searchDocumentation,
  validateDocumentationManifest,
} from '../frontend/src/docs/docsEngine.js';
import {
  docsManifest,
  findPublicPage,
  protocolProfile,
  publicTopNavigation,
} from '../frontend/src/docs/docsManifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);

const result = validateDocumentationManifest(docsManifest);
assert.equal(result.pageCount, docsManifest.length);
pass('documentation manifest and unique routes');

const requiredRoutes = [
  '/docs/get-started/what-is-ghost-bridge',
  '/docs/get-started/quickstart',
  '/docs/learn/architecture',
  '/docs/learn/lifecycle',
  '/docs/learn/versioning',
  '/docs/develop/build-agent',
  '/docs/develop/build-client',
  '/docs/develop/connect-two-agents',
  '/docs/develop/build-with-agent-skills',
  '/docs/develop/capability-discovery',
  '/docs/tools/inspector',
  '/docs/tools/debugging',
  '/docs/security/authentication',
  '/docs/security/authorization',
  '/extensions',
  '/extensions/support-matrix',
  '/specification/0.1-draft',
  '/specification/latest',
  '/registry',
  '/registry/agents',
  '/gbeps',
  '/gbeps/0001',
  '/gbeps/0002',
  '/community/governance',
  '/sdks/typescript/native-client',
];
for (const route of requiredRoutes) assert.ok(findPublicPage(route), `Missing ${route}`);
pass('all required public routes');

for (const item of publicTopNavigation) assert.ok(findPublicPage(item.route));
pass('no dead top navigation');

const search = searchDocumentation('scoped capability discovery');
assert.ok(search.some((item) => item.route === '/docs/develop/capability-discovery'));
assert.ok(groupSearchResults(search).Documentation);
pass('weighted local documentation search');

const answer = askGhostBridge('How do I search capabilities by workspace scope?');
assert.equal(answer.confident, true);
assert.ok(answer.results.every((item) => item.route.startsWith('/')));
assert.equal(
  askGhostBridge('zzzxqv completely unrelated gibberish').message,
  'No confident documentation result found.',
);
pass('deterministic Ask Ghost Bridge retrieval and low confidence');

const copied = pageToMarkdown(findPublicPage('/docs/develop/build-agent'), {
  canonicalOrigin: 'https://docs.example.test',
});
assert.match(copied, /^# Build a Native Agent/m);
assert.match(copied, /```typescript/);
assert.match(copied, /Protocol: ghostbridge\/0\.1-draft/);
assert.match(copied, /Canonical route: https:\/\/docs\.example\.test\/docs\/develop\/build-agent/);
assert.doesNotMatch(copied, /sourcePath|navigationOpen|Copy page/);
pass('safe copy page Markdown');

const llms = generateLlmsText();
const llmsFull = generateLlmsFullText();
for (const page of docsManifest) assert.match(llms, new RegExp(escapeRegExp(page.route)));
for (const privateValue of ['/console', 'customer data', 'authorizationHeader', 'runtimeToken']) {
  assert.equal(llmsFull.includes(privateValue), false);
}
assert.match(llms, /MUST be treated as experimental/);
pass('llms indexes include public docs and exclude private Console content');

const generatedLlms = fs.readFileSync(path.join(root, 'frontend', 'public', 'llms.txt'), 'utf8');
const generatedFull = fs.readFileSync(
  path.join(root, 'frontend', 'public', 'llms-full.txt'),
  'utf8',
);
assert.equal(generatedLlms, llms);
assert.equal(generatedFull, llmsFull);
pass('generated llms files are current');

assert.equal(protocolProfile.protocolState, 'Draft');
assert.equal(protocolProfile.stability, 'Experimental');
assert.equal(protocolProfile.registryState, 'Preview');
pass('honest Draft and Preview status');

const allPublicText = docsManifest.map((page) => pageToMarkdown(page)).join('\n');
for (const claim of [
  'industry standard',
  'widely adopted',
  'enterprise certified',
  'formally verified',
  '100 times better',
]) {
  assert.equal(allPublicText.toLowerCase().includes(claim), false);
}
assert.equal(/mcp (?:adapter|migration|url)/i.test(allPublicText), false);
pass('unsupported claims and migration content absent');

const source = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'components', 'docs', 'DocumentationComponents.jsx'),
  'utf8',
);
for (const component of [
  'PageTitle',
  'PageDescription',
  'StatusBadge',
  'VersionBadge',
  'Callout',
  'Steps',
  'Tabs',
  'CodeBlock',
  'CopyPageButton',
  'SupportMatrix',
  'ProtocolMessageExample',
  'SchemaExample',
  'MermaidDiagram',
  'PreviousNextNavigation',
  'OnThisPage',
  'Breadcrumbs',
]) assert.match(source, new RegExp(`export (?:function|const) ${component}`));
assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
pass('accessible safe documentation component library');

process.stdout.write('PASS Ghost Bridge documentation verification\n');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

