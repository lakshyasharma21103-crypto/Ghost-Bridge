'use strict';

const express = require('express');
const {
  DEFAULT_LIMITS,
  DEFAULT_PROFILE_DECLARATIONS,
  PROTOCOL_VERSION,
  validateDiscovery,
} = require('@ghostbridge/protocol-core');
const {
  nativeProtocolMetricsSnapshot,
  recordNativeProtocolMetric,
} = require('../services/nativeProtocolMetrics.service');

const nativeProtocolRouter = express.Router();

// Public protocol routes are advertised only after their handlers, schema validation, trust
// enforcement, and integration tests land together. Operational status/metrics routes are not
// public Ghost Bridge protocol endpoints.
const PLATFORM_NATIVE_PUBLIC_ENDPOINTS = Object.freeze({});
const ACTIVE_PROFILE_DECLARATIONS = Object.freeze({
  core: DEFAULT_PROFILE_DECLARATIONS.core,
  governedExecution: DEFAULT_PROFILE_DECLARATIONS.governedExecution,
});

function platformDiscovery() {
  return validateDiscovery({
    protocol: 'ghostbridge',
    supportedVersions: [PROTOCOL_VERSION],
    preferredVersion: PROTOCOL_VERSION,
    status: 'experimental',
    features: {
      tasks: false,
      approvals: false,
      delegation: false,
      receipts: false,
      revocation: false,
    },
    profiles: ACTIVE_PROFILE_DECLARATIONS,
    transports: ['https-json'],
    maximumMessageBytes: DEFAULT_LIMITS.maximumMessageBytes,
    endpoints: PLATFORM_NATIVE_PUBLIC_ENDPOINTS,
    extensionNamespaces: ['dev.ghostbridge.platform'],
  });
}

function discoveryHandler(request, response) {
  const discovery = platformDiscovery(request);
  recordNativeProtocolMetric('discovery', 'success');
  request.observer?.emit('info', 'protocol.discovery.requested', {
    protocolVersion: PROTOCOL_VERSION,
    outcome: 'success',
  });
  response.set('cache-control', 'public, max-age=60');
  response.json(discovery);
}

nativeProtocolRouter.get('/status', (_request, response) => {
  response.json({
    protocolVersion: PROTOCOL_VERSION,
    stability: 'experimental',
    platformRole: 'one compatible implementation',
    productionTrustProfile: 'draft',
    independentImplementation: 'not_completed',
    externalSecurityReview: 'not_completed',
  });
});

nativeProtocolRouter.get('/metrics', (_request, response) => {
  response.json({ items: nativeProtocolMetricsSnapshot() });
});

module.exports = {
  discoveryHandler,
  nativeProtocolRouter,
  platformDiscovery,
  PLATFORM_NATIVE_PUBLIC_ENDPOINTS,
};
