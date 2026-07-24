'use strict';

const {
  DEFAULT_PROFILE_DECLARATIONS,
  PROFILE_IDS,
  PROTOCOL_VERSION,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeClient } = require('@ghostbridge/native-client');

function createFlowDeskHost(options = {}) {
  if (typeof options.installGrantResolver !== 'function') {
    throw new TypeError('A generic Install Grant resolver is required.');
  }
  const client = createGhostBridgeClient({
    installGrantResolver: options.installGrantResolver,
    issuerKeyResolver: options.issuerKeyResolver,
    authenticationHandler: options.authenticationHandler,
    supportedProtocolVersions: [PROTOCOL_VERSION],
    profiles: DEFAULT_PROFILE_DECLARATIONS,
    supportedAuthenticationModes: options.supportedAuthenticationModes || [
      'signed_request',
      'oauth',
      'none',
    ],
    extensions: options.extensions || [],
    requiredProfiles: options.requiredProfiles || [PROFILE_IDS.core],
    requiredGovernedFeatures: options.requiredGovernedFeatures || {},
  });

  return Object.freeze({
    client,
    async previewExternalAgent(input) {
      return client.previewInstall(input);
    },
    async addExternalAgent(input) {
      return client.install(input);
    },
    async searchCapabilities(input) {
      return client.searchCapabilities(input);
    },
    async inspectCapability(input) {
      return client.getCapabilityDetails(input);
    },
    async invokeInstalledAgent(input) {
      return client.invokeAndWait(input);
    },
    async revokeConnection(connectionId) {
      return client.revokeConnection(connectionId);
    },
    close() {
      client.close();
    },
  });
}

function createTrustedFlowDeskHost(options = {}) {
  if (!options.publicTrust?.metadata || !options.publicTrust?.jwks) {
    throw new TypeError('Validated public issuer metadata and JWKS fixtures are required.');
  }
  const issuerId = options.publicTrust.metadata.issuerId;
  const host = createFlowDeskHost({
    ...options,
    issuerKeyResolver: options.issuerKeyResolver || (() => ({ publicOnly: true })),
    authenticationHandler:
      options.authenticationHandler ||
      (() => ({ authenticationState: 'synthetic_authorized' })),
    supportedAuthenticationModes: ['signed_request'],
  });
  host.client.trust = {
    required: true,
    localTestMode: options.localTestMode === true,
    allowedLocalIssuers: options.allowedLocalIssuers || [issuerId],
    hostAudience: options.hostAudience || 'flowdesk-host',
    metadata: options.publicTrust.metadata,
    jwks: options.publicTrust.jwks,
    organizationPolicy:
      options.organizationPolicy || {
        version: '1',
        allowedIssuerIds: [issuerId],
        pinnedRootThumbprints: options.publicTrust.metadata.rootKeyThumbprints,
        acceptedAlgorithms: ['EdDSA'],
        unknownIssuerBehavior: 'administrator_review',
      },
    workspacePolicy:
      options.workspacePolicy || {
        version: '1',
        allowedIssuerIds: [issuerId],
        blockedIssuerIds: [],
        unknownIssuerBehavior: 'block',
      },
    clock: options.clock,
  };
  return Object.freeze({
    ...host,
    async verifyPublicTrust() {
      const passport = await host.client.verifyPassport(options.publicTrust.passport, {
        metadata: options.publicTrust.metadata,
        jwks: options.publicTrust.jwks,
        clock: options.clock,
      });
      const capabilityManifest = await host.client.verifyCapabilityManifest(
        options.publicTrust.capabilityManifest,
        options.capabilities,
        options.publicTrust.passport,
        {
          metadata: options.publicTrust.metadata,
          jwks: options.publicTrust.jwks,
          clock: options.clock,
        },
      );
      return Object.freeze({ passport, capabilityManifest });
    },
  });
}

module.exports = { createFlowDeskHost, createTrustedFlowDeskHost };
