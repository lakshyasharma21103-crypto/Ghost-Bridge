import assert from 'node:assert/strict';
import test from 'node:test';
import {
  askGhostBridge,
  generateLlmsFullText,
  generateLlmsText,
  groupSearchResults,
  pageToMarkdown,
  searchDocumentation,
  validateDocumentationManifest,
} from '../src/docs/docsEngine.js';
import {
  docsManifest,
  findPublicPage,
  slugifyHeading,
} from '../src/docs/docsManifest.js';

test('Phase 15B.1 documentation manifest generates unique routes, navigation, and TOCs', () => {
  const result = validateDocumentationManifest();
  assert.ok(result.pageCount >= 93);
  assert.equal(new Set(docsManifest.map((page) => page.route)).size, docsManifest.length);
  assert.equal(slugifyHeading('Receipt & Revocation Lifecycle'), 'receipt-revocation-lifecycle');
  assert.ok(findPublicPage('/docs/learn/architecture').tableOfContents.length >= 7);
});

test('copy page preserves public prose and code while excluding private metadata', () => {
  const markdown = pageToMarkdown(findPublicPage('/docs/develop/build-host'), {
    canonicalOrigin: 'https://docs.example.test',
  });
  assert.match(markdown, /^# Build a Host Application/m);
  assert.match(markdown, /```typescript/);
  assert.match(markdown, /ghostbridge\/0\.1-draft/);
  assert.doesNotMatch(markdown, /sourcePath|lastReviewedAt|Copy page/);
});

test('weighted search groups results and Ask Ghost Bridge refuses low confidence', () => {
  const search = searchDocumentation('typed client errors');
  assert.ok(search.length > 0);
  assert.ok(Object.keys(groupSearchResults(search)).length > 0);
  assert.equal(askGhostBridge('How do I verify a receipt?').confident, true);
  assert.equal(askGhostBridge('zzzxqv unrelated').confident, false);
});

test('llms indexes are deterministic and exclude authenticated Console routes', () => {
  assert.equal(generateLlmsText(), generateLlmsText());
  const full = generateLlmsFullText();
  assert.equal(full.includes('/console'), false);
  assert.equal(full.includes('authorizationHeader'), false);
  for (const page of docsManifest) assert.match(generateLlmsText(), new RegExp(page.route));
});
