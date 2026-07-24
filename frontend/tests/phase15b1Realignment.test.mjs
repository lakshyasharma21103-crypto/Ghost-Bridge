import assert from 'node:assert/strict';
import test from 'node:test';
import {
  docsManifest,
  findPublicPage,
  navigationGroups,
  protocolProfile,
  registryAgents,
} from '../src/docs/docsManifest.js';
import { searchDocumentation } from '../src/docs/docsEngine.js';

test('public documentation leads with universal host-to-external-agent integration', () => {
  const groups = navigationGroups();
  assert.deepEqual(groups.slice(0, 5).map(({ label }) => label), [
    'Get Started',
    'Learn',
    'Build with Ghost Bridge',
    'Governed Execution',
    'Reference',
  ]);
  assert.equal(findPublicPage('/docs/develop/build-host').category, 'Build with Ghost Bridge');
  assert.equal(findPublicPage('/docs/experimental/agent-coordination').category, 'Future and Experimental');
  assert.equal(protocolProfile.coreProfile, 'Active · C1-C3');
  assert.equal(protocolProfile.governedExecutionProfile, 'Active · G1-G3');
  assert.equal(protocolProfile.agentCoordinationProfile, 'Experimental/Deferred');
});

test('cross-company integration search ranks the universal path', () => {
  const results = searchDocumentation('cross-company external agent integration');
  assert.ok(results.length > 0);
  assert.ok([
    '/docs/get-started/what-is-ghost-bridge',
    '/docs/get-started/quickstart',
    '/docs/develop/build-host',
  ].includes(results[0].route));
});

test('registry projects host compatibility without runtime secrets', () => {
  for (const agent of registryAgents) {
    assert.ok(agent.profiles.length > 0);
    assert.ok(agent.authenticationModes.length > 0);
    assert.equal(agent.receiptSupport, true);
  }
  assert.doesNotMatch(JSON.stringify({ docsManifest, registryAgents }), /runtimeToken|accessToken/);
});
