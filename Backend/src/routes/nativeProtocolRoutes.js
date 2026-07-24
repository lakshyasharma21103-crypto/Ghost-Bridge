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

function platformDiscovery(request) {
  const origin = `${request.protocol}://${request.get('host')}`;
  return validateDiscovery({
    protocol: 'ghostbridge',
    supportedVersions: [PROTOCOL_VERSION],
    preferredVersion: PROTOCOL_VERSION,
    status: 'experimental',
    features: {
      tasks: true,
      approvals: true,
      delegation: false,
      receipts: true,
      revocation: true,
    },
    profiles: DEFAULT_PROFILE_DECLARATIONS,
    transports: ['https-json'],
    maximumMessageBytes: DEFAULT_LIMITS.maximumMessageBytes,
    endpoints: {
      passport: `${origin}/api/v1/native/passports/{passportId}`,
      capabilities: `${origin}/api/v1/native/passports/{passportId}/capabilities`,
      installGrantResolution: `${origin}/api/v1/native/install-grants/{grant}/resolve`,
      invocations: `${origin}/api/v1/native/invocations`,
      tasks: `${origin}/api/v1/native/tasks/{taskId}`,
      receipts: `${origin}/api/v1/native/receipts/{receiptId}`,
      approvals: `${origin}/api/v1/native/approvals/{challengeId}/decisions`,
      revocations: `${origin}/api/v1/native/revocations/{subjectType}/{subjectReference}`,
    },
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
};
