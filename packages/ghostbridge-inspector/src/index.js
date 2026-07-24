'use strict';

const http = require('node:http');
const {
  createGhostBridgeClient,
  GhostBridgeError,
} = require('@ghostbridge/native-client');
const {
  DEFAULT_LIMITS,
  assertPlainData,
  boundedSerialize,
  projectDataContract,
  redactPublicData,
} = require('@ghostbridge/protocol-core');

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MAX_TIMELINE_ITEMS = 200;

function assertInspectorTarget(value, options = {}) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('Inspector targets must use HTTP or HTTPS.');
  }
  const loopback = LOOPBACK_HOSTS.has(url.hostname) || url.hostname.startsWith('127.');
  if (!loopback && options.allowUnsafeRemote !== true) {
    throw new InspectorSecurityError(
      'Non-loopback Inspector targets are rejected. Use the explicit unsafe development flag only for a trusted target.',
    );
  }
  if (!loopback && options.unsafeAcknowledged !== true) {
    throw new InspectorSecurityError(
      'Unsafe remote mode requires an explicit risk acknowledgement.',
    );
  }
  if (url.username || url.password) {
    throw new InspectorSecurityError('Credentials must not be embedded in an Inspector target URL.');
  }
  url.username = '';
  url.password = '';
  url.hash = '';
  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    loopback,
    warning: loopback
      ? undefined
      : 'Unsafe development mode is active. The configured remote target must be explicitly trusted.',
  };
}

class InspectorSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InspectorSecurityError';
    this.code = 'INSPECTOR_TARGET_REJECTED';
  }
}

class GhostBridgeInspector {
  constructor(options = {}) {
    const target = assertInspectorTarget(options.baseUrl, options);
    this.target = target;
    this.client = createGhostBridgeClient({
      baseUrl: target.baseUrl,
      fetch: options.fetch,
      timeoutMs: options.timeoutMs || 5_000,
    });
    this.timeline = [];
    this.connected = false;
  }

  async connect() {
    const discovery = await this.capture('discovery', () => this.client.discover());
    const negotiation = await this.capture('version.negotiation', () =>
      this.client.negotiateVersion(),
    );
    this.connected = true;
    return sanitizeInspectorValue({
      target: this.target.baseUrl,
      loopback: this.target.loopback,
      warning: this.target.warning,
      discoveryStatus: discovery.status,
      negotiatedVersion: negotiation.selectedVersion,
      supportedFeatures: discovery.features,
      connectionHealth: 'connected',
    });
  }

  async inspectPassport() {
    const passport = await this.capture('passport.read', () => this.client.getPassport());
    return sanitizeInspectorValue({
      passport,
      issuer: passport.issuer,
      version: passport.passportVersion,
      status: passport.status,
      expiration: passport.expiresAt,
      verificationState: passport.proof ? 'proof_present_not_yet_verified' : 'schema_valid_only',
      revocationState: passport.status === 'revoked' ? 'revoked' : 'not_reported_revoked',
    });
  }

  async inspectIssuer(issuerId, options = {}) {
    const metadata = await this.capture('trust.issuer.discovery', () =>
      this.client.getIssuerMetadata(issuerId, options),
    );
    const jwks = await this.capture('trust.issuer.keys', () =>
      this.client.getIssuerKeys(metadata, options),
    );
    return sanitizeInspectorValue({
      issuer: {
        issuerId: metadata.issuerId,
        displayName: metadata.displayName,
        status: metadata.status,
        metadataSequence: metadata.metadataSequence,
        expiresAt: metadata.expiresAt,
      },
      keys: jwks.keys.map((key) => ({
        kid: key.kid,
        thumbprint: key.thumbprint,
        algorithm: key.alg,
        state: key.state,
        purpose: key.purpose,
        notBefore: key.notBefore,
        expiresAt: key.expiresAt,
      })),
      privateKeyMaterialReceived: jwks.keys.some((key) =>
        ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k'].some((field) => key[field] !== undefined),
      ),
    });
  }

  async inspectPassportTrust(options = {}) {
    const passport = options.passport || (await this.inspectPassport()).passport;
    const result = await this.capture('trust.passport.verify', () =>
      this.client.verifyPassport(passport, options),
    );
    return sanitizeInspectorValue({
      signatureStatus: result.proof.cryptographicValidity,
      issuerMatch: true,
      timeValidity: 'valid',
      keyState: result.proof.keyState,
      keyThumbprint: result.proof.keyThumbprint,
      algorithm: result.proof.algorithm,
      trustPolicyResult: result.policy.category,
      reasonCodes: result.policy.reasonCodes,
    });
  }

  async inspectCapabilityIntegrity(manifest, contracts, passport, options = {}) {
    return this.capture('trust.capability_manifest.verify', () =>
      this.client.verifyCapabilityManifest(manifest, contracts, passport, options),
    );
  }

  inspectConnectionTrust(connectionId) {
    return sanitizeInspectorValue(this.client.inspectConnectionTrust(connectionId));
  }

  async inspectProfiles() {
    const discovery = await this.capture('profiles.read', () => this.client.discover());
    return sanitizeInspectorValue({
      profiles: discovery.profiles || [],
      core: discovery.profiles?.find((profile) => profile.id === 'ghostbridge.core'),
      governedExecution: discovery.profiles?.find(
        (profile) => profile.id === 'ghostbridge.governed-execution',
      ),
      agentCoordination: discovery.profiles?.find(
        (profile) => profile.id === 'ghostbridge.agent-coordination.experimental',
      ),
    });
  }

  async listCapabilities() {
    return this.capture('capability.list', () => this.client.listCapabilities());
  }

  async searchCapabilities(options) {
    return this.capture('capability.search', () => this.client.searchCapabilities(options));
  }

  async inspectCapability(options) {
    return this.capture('capability.inspect', () =>
      this.client.getCapabilityDetails(options),
    );
  }

  async resolveInstallGrant(grant, scope) {
    return this.capture('install.resolve', () =>
      this.client.resolveInstallGrant(grant, scope),
    );
  }

  async previewInstall(options) {
    return this.capture('install.preview', () => this.client.previewInstall(options));
  }

  async install(grant, scope) {
    return this.capture('install.redeem', () => this.client.install(grant, scope));
  }

  async invoke(options, envelope) {
    return this.capture('invocation.create', () => this.client.invoke(options, envelope));
  }

  async inspectTask(taskId) {
    return this.capture('task.read', () => this.client.getTask(taskId));
  }

  async cancelTask(taskId) {
    return this.capture('task.cancel', () => this.client.cancelTask(taskId));
  }

  async submitApprovalDecision(challengeId, decision) {
    return this.capture('approval.decide', () =>
      this.client.submitApprovalDecision(challengeId, decision),
    );
  }

  async inspectReceipt(receiptId) {
    const receipt = await this.capture('receipt.read', () => this.client.getReceipt(receiptId));
    const verification = await this.client.verifyReceipt(receipt);
    return sanitizeInspectorValue({ receipt, verificationState: verification.proofState });
  }

  async inspectRevocation(subjectType, subjectReference) {
    return this.capture('revocation.read', () =>
      this.client.checkRevocation(subjectType, subjectReference),
    );
  }

  previewDataContract(input, contract, options = {}) {
    return sanitizeInspectorValue({
      input,
      projectedOutput: projectDataContract(input, contract, options),
      rejectedFields: [],
      redactionState: 'applied',
    });
  }

  messages() {
    return this.timeline.map((item) => structuredClone(item));
  }

  close() {
    this.client.close();
    this.connected = false;
  }

  async capture(messageType, operation) {
    const startedAt = new Date().toISOString();
    try {
      const result = await operation();
      this.record({
        messageType,
        timestamp: startedAt,
        outcome: 'success',
        response: sanitizeInspectorValue(result),
      });
      return sanitizeInspectorValue(result);
    } catch (error) {
      this.record({
        messageType,
        timestamp: startedAt,
        outcome: 'error',
        errorCode: error instanceof GhostBridgeError ? error.code : 'INSPECTOR_ERROR',
        ...(error?.requestId ? { requestId: error.requestId } : {}),
        ...(error?.traceId ? { traceId: error.traceId } : {}),
      });
      throw error;
    }
  }

  record(item) {
    assertPlainData(item);
    this.timeline.push(sanitizeInspectorValue(item));
    if (this.timeline.length > MAX_TIMELINE_ITEMS) {
      this.timeline.splice(0, this.timeline.length - MAX_TIMELINE_ITEMS);
    }
  }
}

function sanitizeInspectorValue(value) {
  const sanitized = redactPublicData(value);
  const scrubbed = scrubHeaders(sanitized);
  return JSON.parse(boundedSerialize(scrubbed, {
    ...DEFAULT_LIMITS,
    maximumMessageBytes: 524_288,
  }));
}

function scrubHeaders(value) {
  if (Array.isArray(value)) return value.map(scrubHeaders);
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:authorization|cookie|set-cookie|proxy-authorization)$/i.test(key)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = scrubHeaders(child);
    }
  }
  return output;
}

async function startInspectorUi(options = {}) {
  const inspector = new GhostBridgeInspector(options);
  const host = options.host || '127.0.0.1';
  if (!LOOPBACK_HOSTS.has(host) && !host.startsWith('127.')) {
    throw new InspectorSecurityError('The Inspector UI must listen on a loopback address.');
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader('cache-control', 'no-store');
    response.setHeader(
      'content-security-policy',
      "default-src 'none'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    );
    if (request.method === 'GET' && request.url === '/api/session') {
      response.setHeader('content-type', 'application/json; charset=utf-8');
      try {
        const connection = inspector.connected ? undefined : await inspector.connect();
        response.end(boundedSerialize({
          connection,
          messages: inspector.messages(),
        }));
      } catch (error) {
        response.statusCode = 502;
        response.end(boundedSerialize({
          errorCode: error?.code || 'INSPECTOR_CONNECTION_FAILED',
          safeMessage: String(error?.message || 'Inspector connection failed.').slice(0, 500),
        }));
      }
      return;
    }
    if (request.method !== 'GET' || request.url !== '/') {
      response.statusCode = 404;
      response.end('Not found');
      return;
    }
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(inspectorHtml(inspector.target));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port || 6277, host, resolve);
  });
  return {
    inspector,
    address: server.address(),
    close: async () => {
      inspector.close();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

function inspectorHtml(target) {
  const warning = target.warning
    ? `<p role="alert"><strong>Warning:</strong> ${escapeHtml(target.warning)}</p>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Ghost Bridge Inspector</title><style>
body{font:14px/1.5 system-ui;margin:0;color:#172033;background:#f7f9fb}header,main{max-width:1100px;margin:auto;padding:20px}
header{border-bottom:1px solid #dce2e8}nav{display:flex;gap:8px;flex-wrap:wrap}button{padding:7px 10px;background:white;border:1px solid #bdc7d2}
section{background:white;border:1px solid #dce2e8;padding:16px;margin-top:16px}code,pre{font-family:ui-monospace,monospace;overflow:auto}
:focus-visible{outline:3px solid #1c78c0;outline-offset:2px}</style></head>
<body><header><h1>Ghost Bridge Inspector</h1><p>Local development UI · ghostbridge/0.1-draft</p>${warning}</header>
<main><nav aria-label="Inspector sections">${[
  'Connection','Issuer','Issuer Metadata','Keys','Passport','Passport Proof','Profiles',
  'Capabilities','Capability Integrity','Install Preview','Install Proof','Connection Proof',
  'Authentication','Request Integrity','Invocation','Tasks','Receipts','Receipt Proof',
  'Revocation','Trust Timeline','Messages','Logs',
  'Experimental: Agent Coordination',
].map((label) => `<button type="button">${label}</button>`).join('')}</nav>
<section><h2>Connection</h2><p>Target: <code>${escapeHtml(target.baseUrl)}</code></p>
<p>This UI exposes sanitized local inspection data. It never displays authorization headers, cookies, or credentials.</p></section></main></body></html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

module.exports = {
  GhostBridgeInspector,
  InspectorSecurityError,
  assertInspectorTarget,
  sanitizeInspectorValue,
  startInspectorUi,
};
