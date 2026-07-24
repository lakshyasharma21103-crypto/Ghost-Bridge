'use strict';

const { createLocalTestKeyProvider } = require('@ghostbridge/issuer');
const { createTrustedCodeForgeProvider } = require('@ghostbridge/example-codeforge-provider');
const { createTrustedFlowDeskHost } = require('@ghostbridge/example-flowdesk-host');
const {
  ReplayCache,
  signRequest,
  validateRevocationSet,
  verifyDocument,
} = require('@ghostbridge/trust');

async function createPhase15cTrustFixture(options = {}) {
  const epoch = options.epoch || Date.now();
  let offset = 0;
  const clock = () => epoch + offset;
  const advance = (milliseconds) => {
    offset += milliseconds;
    return clock();
  };

  const hostKeys = createLocalTestKeyProvider({ mode: 'test', clock });
  const hostKey = hostKeys.createKey({
    kid: 'flowdesk_request_1',
    purpose: ['request_signing'],
    expiresAt: new Date(epoch + 3_600_000).toISOString(),
  });
  hostKeys.transitionKeyState(hostKey.kid, 'prepublished', { sequence: 1 });
  hostKeys.transitionKeyState(hostKey.kid, 'active', { sequence: 2 });
  const hostJwks = { issuer: 'https://flowdesk.example', keys: hostKeys.listPublicKeys() };

  const provider = await createTrustedCodeForgeProvider({
    issuerId: 'http://127.0.0.1:8787',
    hostAudience: 'flowdesk-host',
    clock,
    requestIntegrity: {
      required: true,
      jwks: hostJwks,
      audience: 'codeforge-agent-runtime',
      issuer: 'https://flowdesk.example',
      replayCache: new ReplayCache({ clock }),
    },
  });
  const runtime = await provider.listen({ port: 0, host: '127.0.0.1' });
  const scope = {
    organizationScope: 'organization_flowdesk',
    workspaceScope: 'workspace_builder',
  };
  const grant = provider.issueInstallGrant(scope);
  const host = createTrustedFlowDeskHost({
    publicTrust: provider.publicTrust,
    capabilities: provider.agent.listCapabilities(),
    installGrantResolver: () => ({ baseUrl: runtime.baseUrl }),
    localTestMode: true,
    allowedLocalIssuers: [provider.publicTrust.metadata.issuerId],
    hostAudience: 'flowdesk-host',
    clock,
  });

  async function install() {
    const preview = await host.previewExternalAgent({ grant: grant.key, ...scope });
    const connection = await host.addExternalAgent({
      grant: grant.key,
      ...scope,
      approvedCapabilityKeys: ['codeforge.create_app'],
    });
    return { preview, connection };
  }

  async function invoke(connection, overrides = {}) {
    const invocationId = overrides.invocationId || 'invocation_codeforge_1';
    const messageId = overrides.messageId || `message_${offset + 1}`;
    const nonce = overrides.nonce || `nonce_connection_${offset + 1}_0123456789`;
    const payload = overrides.payload || { projectName: 'Trusted App', template: 'web' };
    const issuedAt = new Date(clock()).toISOString();
    const expiresAt = new Date(clock() + 60_000).toISOString();
    const request = {
      method: 'POST',
      path: '/ghostbridge/invocations',
      body: payload,
      audience: 'codeforge-agent-runtime',
      connectionId: connection.connectionId,
      protocolVersion: 'ghostbridge/0.1-draft',
      invocationId,
      messageId: `request_${messageId}`,
      issuedAt,
      expiresAt,
      nonce,
      ...scope,
    };
    const signedRequest = await signRequest(request, hostKeys.signer(hostKey.kid));
    const envelope = {
      protocolVersion: 'ghostbridge/0.1-draft',
      invocationId,
      messageId,
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      initiatingSubject: 'flowdesk-user',
      targetAgentId: 'codeforge-development-agent',
      targetPassportVersion: provider.publicTrust.passport.passportVersion,
      capabilityKey: 'codeforge.create_app',
      capabilityVersion: '1.0.0',
      inputContractReference: 'schema:codeforge.create-app-input@1',
      idempotencyKey: overrides.idempotencyKey || 'create_trusted_app',
      deadline: new Date(clock() + 30_000).toISOString(),
      traceContext: {},
      payload,
      payloadClassification: ['development.project_request'],
      requestedReceiptProfile: 'signed-governed',
      requestIntegrity: { request, signedRequest },
    };
    return {
      request,
      signedRequest,
      envelope,
      result: await host.client.invoke(connection.connectionId, envelope),
    };
  }

  function verifyReceipt(receipt) {
    return host.client.verifyReceipt(receipt, {
      passport: provider.publicTrust.passport,
      jwks: provider.publicTrust.jwks,
      expectedAudience: 'flowdesk-host',
      clock,
    });
  }

  function verifyInitialRevocation() {
    return validateRevocationSet(
      provider.publicTrust.revocationSet,
      provider.publicTrust.jwks,
      {
        expectedIssuer: provider.publicTrust.metadata.issuerId,
        clock,
      },
    );
  }

  function verifyRootTrust() {
    const result = verifyDocument(
      provider.publicTrust.metadata,
      provider.publicTrust.jwks,
      {
        purpose: 'issuer_metadata',
        expectedIssuer: provider.publicTrust.metadata.issuerId,
        clock,
      },
    );
    return {
      ...result,
      pinned: provider.publicTrust.metadata.rootKeyThumbprints.includes(
        result.keyThumbprint,
      ),
    };
  }

  return {
    epoch,
    clock,
    advance,
    scope,
    grant,
    provider,
    host,
    runtime,
    hostJwks,
    install,
    invoke,
    verifyReceipt,
    verifyInitialRevocation,
    verifyRootTrust,
    close: async () => {
      host.close();
      await runtime.close();
      hostKeys.destroyTestKey(hostKey.kid);
    },
  };
}

module.exports = { createPhase15cTrustFixture };
