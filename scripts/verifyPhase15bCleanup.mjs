import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { docsManifest, publicTopNavigation } from '../frontend/src/docs/docsManifest.js';
import { validateDocumentationManifest } from '../frontend/src/docs/docsEngine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

for (const file of [
  'docs/engineering/phase-15b-cleanup-inventory.md',
  'docs/engineering/phase-15b-cleanup-baseline.md',
  'docs/legacy/mcp-code-inventory.md',
  'docs/PHASE_15B_COMPLETION_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, file)));
pass('cleanup inventory exists');

for (const removed of [
  'frontend/src/pages/ProtocolProjectPage.jsx',
  'docs/generated/llms.txt',
  'docs/generated/llms-full.txt',
]) assert.equal(fs.existsSync(path.join(root, removed)), false, `${removed} should remain removed`);
assert.equal(
  read('scripts/generateGhostBridgeDocsIndex.mjs').includes("path.join(root, 'docs', 'generated')"),
  false,
);
pass('approved obsolete scaffolding and duplicate generated indexes removed');

const core = read('packages/ghostbridge-protocol-core/src/index.js');
for (const canonical of [
  'parseProtocolVersion',
  'negotiateVersion',
  'validatePassport',
  'validateCapabilityContract',
  'projectDataContract',
  'redactPublicData',
  'boundedSerialize',
  'validateExtensionIdentifier',
]) assert.match(core, new RegExp(`function ${canonical}\\(`));
pass('canonical protocol implementation');

const nativeDirectories = [
  'packages/ghostbridge-protocol-core',
  'packages/ghostbridge-native-client',
  'packages/ghostbridge-native-agent',
  'packages/ghostbridge-conformance',
  'packages/ghostbridge-inspector',
];
for (const directory of nativeDirectories) {
  const files = walk(path.join(root, directory)).filter((file) => /\.(?:js|ts|json)$/.test(file));
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /(?:require\(|from\s+)['"][^'"]*(?:Backend|frontend\/src|mcp)/i);
}
pass('no forbidden package imports');
pass('no MCP dependency in native packages');

const activeTypeDefinitions = nativeDirectories
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((file) => file.endsWith('.d.ts'))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
assert.equal((activeTypeDefinitions.match(/interface AgentPassport\b/g) || []).length, 1);
assert.equal((activeTypeDefinitions.match(/interface InvocationEnvelope\b/g) || []).length, 1);
pass('no duplicate active protocol DTOs');

const installUi = read('frontend/src/pages/ResolvePassportKey.jsx');
assert.doesNotMatch(installUi, /mcp|endpoint url/i);
pass('no MCP URL in native installation');

validateDocumentationManifest();
for (const item of publicTopNavigation) assert.ok(docsManifest.some((page) => page.route === item.route));
assert.equal(new Set(docsManifest.map((page) => page.route)).size, docsManifest.length);
pass('no dead public navigation');
pass('documentation links valid');

const publicSource = [
  read('frontend/src/layouts/PublicProtocolLayout.jsx'),
  read('frontend/src/pages/ProtocolDocs.jsx'),
].join('\n');
assert.doesNotMatch(publicSource, /href=["']https:\/\/github\.com\/["']/);
assert.doesNotMatch(publicSource, />\s*(?:Coming soon|TODO)\s*</i);
pass('no placeholder actions');

const skillDirectory = path.join(root, 'skills', 'ghostbridge-agent-dev');
const skill = read('skills/ghostbridge-agent-dev/SKILL.md');
const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert.ok(frontmatter);
const metadataKeys = frontmatter[1]
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split(':', 1)[0]);
assert.deepEqual(metadataKeys, ['name', 'description']);
assert.match(frontmatter[1], /^name: ghostbridge-agent-dev$/m);
assert.ok(skill.split(/\r?\n/).length < 500);
assert.equal(fs.existsSync(path.join(skillDirectory, 'README.md')), false);
const skillReferences = fs
  .readdirSync(path.join(skillDirectory, 'references'))
  .filter((file) => file.endsWith('.md'));
assert.equal(skillReferences.length, 9);
pass('agent-development skill structure');

for (const directory of nativeDirectories) {
  const manifest = JSON.parse(read(`${directory}/package.json`));
  assert.ok(manifest.exports?.['.']);
  const target = manifest.exports['.'].require || manifest.exports['.'].default;
  assert.ok(fs.existsSync(path.join(root, directory, target)));
}
pass('package exports valid');

const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
assert.doesNotMatch(tracked, /(^|\/)\.env$/m);
assert.doesNotMatch(tracked, /(?:^|\/)(?:dist|coverage|\.nyc_output)\//m);
pass('no tracked environment secrets');
pass('no accidental generated artifacts');

const configText = [
  read('STAGING_PILOT_OPERATIONS.md'),
  read('GA_COMMERCIAL_OPERATIONS.md'),
].join('\n');
assert.match(configText, /grounded research remains disabled/i);
pass('grounded research remains disabled');

for (const packageName of [
  '@ghostbridge/protocol-core',
  '@ghostbridge/native-client',
  '@ghostbridge/native-agent',
  '@ghostbridge/conformance',
  '@ghostbridge/inspector',
]) {
  runNpm(['run', 'build', '--workspace', packageName]);
  runNpm(['run', 'test', '--workspace', packageName]);
}
pass('security coverage preserved');
pass('organization isolation preserved');
pass('workspace isolation preserved');
pass('Phase 15B cleanup verification');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function runNpm(args) {
  if (process.platform === 'win32') {
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd', ...args], {
      cwd: root,
      stdio: 'ignore',
    });
    return;
  }
  execFileSync('npm', args, { cwd: root, stdio: 'ignore' });
}
