'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PROFILE_IDS,
  PROTOCOL_VERSION,
  validateCapabilityContract,
  validateContractValue,
  validateDiscovery,
  validatePassport,
} = require('@ghostbridge/protocol-core');
const {
  CompatibilityError,
  UnsupportedProtocolVersionError,
} = require('@ghostbridge/native-client');
const {
  createCodeForgeProvider,
  createAppInputSchema,
  createAppOutputSchema,
} = require('@ghostbridge/example-codeforge-provider');
const { createFlowDeskHost } = require('@ghostbridge/example-flowdesk-host');

const root = path.resolve(__dirname, '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);

async function main() {
  const provider = createCodeForgeProvider();
  const listener = await provider.listen();
  let host;
  try {
    const grant = provider.issueInstallGrant({
      organizationScope: 'org_flowdesk',
      workspaceScope: 'workspace_automation',
    });
    const resolver = async ({ grant: presentedGrant }) => {
      assert.equal(typeof presentedGrant, 'string');
      return { baseUrl: listener.baseUrl };
    };
    const hostSource = fs.readFileSync(
      path.join(root, 'protocol', 'examples', 'flowdesk-host', 'src', 'index.js'),
      'utf8',
    );
    const hostManifest = fs.readFileSync(
      path.join(root, 'protocol', 'examples', 'flowdesk-host', 'package.json'),
      'utf8',
    );
    assert.doesNotMatch(hostSource, /codeforge|providerName|provider-specific|adapter/i);
    assert.doesNotMatch(hostManifest, /codeforge|native-agent|Backend|frontend/i);
    pass('independent provider fixture');
    pass('independent host fixture');

    const incompatibleHost = createFlowDeskHost({
      installGrantResolver: resolver,
      supportedAuthenticationModes: ['signed_request'],
      extensions: [
        {
          identifier: 'com.example/required-host-feature',
          version: '1.0.0',
          status: 'experimental',
          required: true,
          profiles: [PROFILE_IDS.core],
        },
      ],
    });
    await assert.rejects(
      () =>
        incompatibleHost.previewExternalAgent({
          grant: grant.key,
          organizationScope: 'org_flowdesk',
          workspaceScope: 'workspace_automation',
        }),
      (error) =>
        error instanceof CompatibilityError &&
        error.code === 'REQUIRED_EXTENSION_UNSUPPORTED',
    );
    incompatibleHost.close();

    let authenticationCalls = 0;
    host = createFlowDeskHost({
      installGrantResolver: resolver,
      issuerKeyResolver: async (issuer) =>
        issuer === 'codeforge-agent-provider.synthetic' ? { verified: true } : undefined,
      supportedAuthenticationModes: ['signed_request', 'oauth'],
      authenticationHandler: async ({ mode }) => {
        assert.equal(mode, 'signed_request');
        authenticationCalls += 1;
        return { connectionReference: 'auth_session_synthetic' };
      },
    });

    await host.client.prepareInstallTarget(grant.key, {
      organizationScope: 'org_flowdesk',
      workspaceScope: 'workspace_automation',
    });
    const discovery = validateDiscovery(await host.client.discover());
    assert.equal(discovery.protocol, 'ghostbridge');
    pass('generic discovery');
    assert.equal((await host.client.negotiateVersion()).selectedVersion, PROTOCOL_VERSION);
    pass('protocol negotiation');
    const passport = validatePassport(await host.client.getPassport());
    assert.equal(passport.agentId, 'codeforge-development-agent');
    pass('Agent Passport validation');
    const capabilities = await host.client.listCapabilities();
    capabilities.forEach(validateCapabilityContract);
    assert.equal(capabilities[0].capabilityKey, 'codeforge.create_app');
    pass('Capability Contract validation');

    const installInput = {
      grant: grant.key,
      organizationScope: 'org_flowdesk',
      workspaceScope: 'workspace_automation',
      approvedCapabilityKeys: ['codeforge.create_app'],
    };
    const preview = await host.previewExternalAgent(installInput);
    assert.equal(preview.compatibility.status, 'compatible');
    assert.equal(preview.compatibility.profiles.core.supported, true);
    assert.equal(preview.compatibility.profiles.governedExecution.supported, true);
    assert.equal(preview.compatibility.profiles.agentCoordination.status, 'deferred');
    pass('profile compatibility');
    assert.equal(preview.redemptionState, 'available');
    pass('generic Install Grant resolution');
    const previewText = JSON.stringify(preview);
    assert.doesNotMatch(
      previewText,
      /runtimeReference|authenticationSetupReference|authorization|accessToken|cookie/i,
    );
    pass('safe installation preview');
    assert.equal(preview.authentication.selectedMode, 'signed_request');
    pass('authentication-mode negotiation');

    const connection = await host.addExternalAgent(installInput);
    assert.equal(connection.status, 'active');
    assert.equal(connection.authenticationMode, 'signed_request');
    assert.equal(authenticationCalls, 1);
    pass('generic Agent Connection');
    const replay = await host.addExternalAgent(installInput);
    assert.equal(replay.connectionId, connection.connectionId);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(provider.agent.getConnectionCount(), 1);
    assert.equal(authenticationCalls, 1);
    pass('installation idempotency');

    const scope = {
      organizationScope: 'org_flowdesk',
      workspaceScope: 'workspace_automation',
    };
    const catalog = await host.searchCapabilities({ query: 'create app', ...scope });
    assert.equal(catalog.items[0].capabilityKey, 'codeforge.create_app');
    pass('progressive capability discovery');
    const capability = await host.inspectCapability({
      agentId: connection.agentId,
      capabilityKey: 'codeforge.create_app',
      ...scope,
    });
    validateContractValue(
      { projectName: 'Universal Demo', template: 'web' },
      createAppInputSchema,
      'input',
    );
    assert.deepEqual(capability.inputSchema, createAppInputSchema);
    pass('input validation');

    const invocation = await host.invokeInstalledAgent({
      connectionId: connection.connectionId,
      capability: 'codeforge.create_app',
      input: { projectName: 'Universal Demo', template: 'web' },
      initiatingSubject: 'user_flowdesk',
      ...scope,
      deadline: '2099-01-01T00:00:00.000Z',
      idempotencyKey: 'flowdesk-create-universal-demo',
    });
    assert.equal(invocation.output.state, 'created');
    pass('external-agent Invocation');
    assert.equal(invocation.task.state, 'completed');
    pass('Execution Task');
    validateContractValue(invocation.output, createAppOutputSchema, 'output');
    pass('result validation');
    assert.equal((await host.client.verifyReceipt(invocation.receipt)).valid, true);
    pass('Execution Receipt verification');

    const revocation = await host.revokeConnection(connection.connectionId);
    assert.equal(revocation.status, 'revoked');
    pass('Connection revocation');
    await assert.rejects(
      () =>
        host.invokeInstalledAgent({
          connectionId: connection.connectionId,
          capability: 'codeforge.create_app',
          input: { projectName: 'Blocked', template: 'web' },
          ...scope,
          idempotencyKey: 'blocked-after-revocation',
        }),
      (error) => error.code === 'CONNECTION_NOT_ACTIVE',
    );
    await assert.rejects(
      () => host.client.negotiateVersion({ localSupported: ['ghostbridge/9.0'] }),
      UnsupportedProtocolVersionError,
    );
    pass('standard error handling');

    assert.doesNotMatch(hostSource, /adapter/i);
    pass('no provider-specific adapter');
    assert.doesNotMatch(hostSource, /codeforge|providerName/i);
    pass('no provider-name branching');
    assert.doesNotMatch(hostSource, /baseUrl|runtimeReference|endpoint/i);
    pass('no user-entered runtime endpoint');
    const evidence = JSON.stringify({ preview, connection, invocation, revocation });
    assert.doesNotMatch(evidence, /Bearer |authorization|accessToken|cookie|password/i);
    pass('no credentials leaked');
    assertNoNativeDependency('mcp');
    pass('no MCP dependency');
    const commercialState = [
      fs.readFileSync(path.join(root, 'STAGING_PILOT_OPERATIONS.md'), 'utf8'),
      fs.readFileSync(path.join(root, 'GA_COMMERCIAL_OPERATIONS.md'), 'utf8'),
    ].join('\n');
    assert.match(commercialState, /grounded research remains disabled/i);
    pass('grounded research remains disabled');
    pass('Ghost Bridge universal agent compatibility');
  } finally {
    host?.close();
    await listener.close();
  }
}

function assertNoNativeDependency(term) {
  for (const directory of [
    'packages/ghostbridge-protocol-core',
    'packages/ghostbridge-native-client',
    'packages/ghostbridge-native-agent',
    'protocol/examples/flowdesk-host',
  ]) {
    const files = walk(path.join(root, directory)).filter((file) => /\.(?:js|json|ts)$/.test(file));
    const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    assert.doesNotMatch(source, new RegExp(`(?:require|from|dependency).*${term}`, 'i'));
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
