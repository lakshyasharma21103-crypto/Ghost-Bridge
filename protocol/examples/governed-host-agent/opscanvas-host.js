'use strict';

const {
  DEFAULT_PROFILE_DECLARATIONS,
  PROFILE_IDS,
  PROTOCOL_VERSION,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeClient } = require('@ghostbridge/native-client');

function createOpsCanvasHost(options = {}) {
  if (typeof options.installGrantResolver !== 'function') {
    throw new TypeError('A generic Install Grant resolver is required.');
  }
  return createGhostBridgeClient({
    installGrantResolver: options.installGrantResolver,
    issuerKeyResolver: options.issuerKeyResolver,
    authenticationHandler: options.authenticationHandler,
    supportedProtocolVersions: [PROTOCOL_VERSION],
    profiles: DEFAULT_PROFILE_DECLARATIONS,
    supportedAuthenticationModes: ['platform_brokered', 'signed_request'],
    requiredProfiles: [PROFILE_IDS.core, PROFILE_IDS.governedExecution],
    requiredGovernedFeatures: { tasks: true, receipts: true },
  });
}

module.exports = { createOpsCanvasHost };
