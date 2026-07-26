import crypto from 'node:crypto';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DEFAULT_PROFILE_DECLARATIONS,
  PROTOCOL_VERSION,
} = require('@ghostbridge/protocol-core');
const {
  TRUST_PROFILE_VERSION,
  digest,
} = require('@ghostbridge/trust');
const {
  createSyntheticIssuer,
} = require('@ghostbridge/issuer');

const profile = process.argv.find((value) => value.startsWith('--profile='))?.split('=')[1] || 'core';
const governed = profile === 'governed' || profile === 'trust';
const trustRequired = profile === 'trust';
const hostAudience = 'raw-host';
const organizationScope = 'org_black_box';
const workspaceScope = 'workspace_black_box';
const capabilityKey = 'fixture.echo';
const now = Date.now();
const issuer = governed
  ? await createSyntheticIssuer({ issuerId: 'http://127.0.0.1', clock: Date.now })
  : undefined;
const signedDocumentTime = Date.now();

const capability = {
  capabilityKey,
  capabilityVersion: '1',
  displayName: 'Echo fixture',
  safeDescription: 'Echoes bounded black-box data.',
  inputContractReference: 'schema:fixture.echo-input@1',
  outputContractReference: 'schema:fixture.echo-output@1',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['echo'],
    properties: { echo: { type: 'string', minLength: 1, maxLength: 100 } },
  },
  outputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['echo'],
    properties: { echo: { type: 'string', minLength: 1, maxLength: 100 } },
  },
  acceptedDataClasses: ['business'],
  producedDataClasses: ['business'],
  prohibitedDataClasses: ['secret'],
  riskCategory: governed ? 'moderate' : 'low',
  sideEffectCategory: governed ? 'reversible_write' : 'read',
  idempotencySupport: governed ? 'required' : 'optional',
  asynchronousSupport: true,
  cancellationSupport: true,
  requiredPermissions: [],
  approvalRequirement: governed ? 'required' : 'none',
  delegationPolicy: { allowed: false },
  timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
  receiptRequirement: 'required',
  status: 'active',
};

const passportPayload = {
  protocolVersion: PROTOCOL_VERSION,
  passportId: 'passport_black_box',
  passportVersion: '1',
  agentId: 'agent_black_box',
  displayName: 'Raw Black Box Agent',
  safeDescription: 'A serialized-process conformance fixture.',
  issuer: issuer?.toolkit.issuerId || 'fixture:black-box',
  issuedAt: new Date(issuer ? signedDocumentTime : now - 1_000).toISOString(),
  expiresAt: new Date(now + 3_600_000).toISOString(),
  status: 'active',
  capabilities: [capabilityKey],
  supportedProtocolVersions: [PROTOCOL_VERSION],
  supportedTransports: ['http-json'],
  profiles: {
    core: DEFAULT_PROFILE_DECLARATIONS.core,
    ...(governed
      ? { governedExecution: DEFAULT_PROFILE_DECLARATIONS.governedExecution }
      : {}),
  },
  dataDeclarations: [],
  delegationDeclarations: [],
  approvalDeclarations: governed ? [{ capabilityKey, required: true }] : [],
  receiptSupport: true,
  revocationReference: '/ghostbridge/revocations/passport/passport_black_box',
  ...(governed
    ? {
        trustProfileVersion: TRUST_PROFILE_VERSION,
        authorizedAgentExecutionKeys: [
          issuer.toolkit.authorizeAgentExecutionKey(issuer.keyIds.execution),
        ],
      }
    : {}),
};
const passport = trustRequired
  ? await issuer.toolkit.signPassport(passportPayload, issuer.keyIds.operational)
  : passportPayload;
const issuerMetadata = trustRequired
  ? await issuer.toolkit.createIssuerMetadata({
      rootKeyId: issuer.keyIds.root,
      issuedAt: new Date(signedDocumentTime).toISOString(),
      expiresAt: new Date(now + 3_600_000).toISOString(),
    })
  : undefined;
const jwks = governed ? issuer.toolkit.publishJwks() : undefined;
const revocationSet = trustRequired
  ? await issuer.toolkit.signRevocationSet({
      generatedAt: new Date(signedDocumentTime).toISOString(),
      nextUpdate: new Date(now + 300_000).toISOString(),
      entries: [],
    }, issuer.keyIds.revocation)
  : undefined;

const grant = {
  key: `gb-install-${crypto.randomBytes(24).toString('base64url')}`,
  reference: 'grant_black_box',
  expiresAt: new Date(now + 300_000).toISOString(),
  redeemed: false,
};
const connections = new Map();
const tasks = new Map();
const receipts = new Map();
const decisions = new Map();
const idempotency = new Map();
let approvalChallenge;
let connectionRevoked = false;

function authenticated(request) {
  return request.headers.authorization === 'Bearer raw-host-fixture';
}

function send(response, status, body, contentType = 'application/json') {
  response.statusCode = status;
  response.setHeader('content-type', contentType);
  response.setHeader('cache-control', 'no-store');
  response.end(contentType === 'application/json' ? JSON.stringify(body) : String(body));
}

function safeError(response, status, errorCode, safeMessage) {
  send(response, status, {
    protocolVersion: PROTOCOL_VERSION,
    errorCode,
    safeMessage,
    retryable: false,
  });
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 262_144) throw new Error('MESSAGE_TOO_LARGE');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function connectionOffer(origin) {
  return {
    connectionOfferId: 'offer_black_box',
    agentId: passport.agentId,
    passportReference: `passports/${passport.passportId}/versions/${passport.passportVersion}`,
    protocolVersion: PROTOCOL_VERSION,
    transportCategory: 'http-json',
    runtimeReference: `${origin}/ghostbridge/invocations`,
    authenticationMode: 'signed_request',
    authenticationModes: ['signed_request'],
    authenticationSetupReference: 'fixture:bearer-reference',
    audience: hostAudience,
    expiresAt: grant.expiresAt,
    acceptedOrganizationScope: organizationScope,
    acceptedWorkspaceScope: workspaceScope,
    restrictions: [],
    revocationReference: '/ghostbridge/revocations/install_grant/grant_black_box',
  };
}

function newTask(invocationId, state = 'completed') {
  const timestamp = new Date().toISOString();
  return {
    taskId: `task_${crypto.randomUUID()}`,
    invocationId,
    state,
    safeProgressCategory: state,
    createdAt: timestamp,
    updatedAt: timestamp,
    deadline: new Date(Date.now() + 30_000).toISOString(),
    cancellationSupported: true,
    retryCategory: 'none',
    nextActionCategory: state === 'waiting_for_approval' ? 'submit_approval' : 'none',
    ...(['completed', 'cancelled'].includes(state)
      ? { startedAt: timestamp, completedAt: timestamp }
      : {}),
  };
}

async function executionReceipt(envelope, connection, task, output, outcome = 'completed') {
  const evidence = {
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    connectionId: connection.connectionId,
    capabilityKey,
    capabilityVersion: '1',
    organizationScope,
    workspaceScope,
    outcome,
  };
  const unsigned = {
    receiptId: `receipt_${crypto.randomUUID()}`,
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    connectionId: connection.connectionId,
    agentId: passport.agentId,
    passportId: passport.passportId,
    passportVersion: passport.passportVersion,
    capabilityKey,
    capabilityVersion: '1',
    organizationScope,
    workspaceScope,
    outcome,
    outputContractReference: capability.outputContractReference,
    startedAt: task.startedAt || task.createdAt,
    completedAt: task.completedAt || new Date().toISOString(),
    attemptCount: 1,
    ...(envelope.approvalReference
      ? { approvalReference: envelope.approvalReference }
      : {}),
    ...(envelope.idempotencyKey
      ? {
          requestFingerprint: digest({
            connectionId: connection.connectionId,
            capabilityKey,
            capabilityVersion: '1',
            idempotencyKey: envelope.idempotencyKey,
            payload: envelope.payload,
          }),
        }
      : {}),
    outputDigest: digest(output ?? null),
    evidenceDigest: digest(evidence),
    billableStatusCategory: 'non_billable',
    nonBillableReason: 'black_box_fixture',
    revocationStateAtExecution: 'active',
    ...(governed
      ? {
          issuer: passport.issuer,
          audience: hostAudience,
          agentExecutionKeyId: issuer.keyIds.execution,
          issuedAt: task.completedAt,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          messageId: `receipt_message_${task.taskId}`,
          trustProfileVersion: TRUST_PROFILE_VERSION,
        }
      : {}),
  };
  return governed
    ? issuer.toolkit.signReceipt(unsigned, issuer.keyIds.execution)
    : unsigned;
}

const server = http.createServer(async (request, response) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(request.url, origin);
  try {
    if (request.method === 'GET' && url.pathname === '/.well-known/ghostbridge') {
      send(response, 200, {
        protocol: 'ghostbridge',
        supportedVersions: [PROTOCOL_VERSION],
        preferredVersion: PROTOCOL_VERSION,
        status: 'experimental',
        features: {
          tasks: true,
          approvals: governed,
          delegation: false,
          receipts: true,
          revocation: true,
        },
        profiles: passportPayload.profiles,
        transports: ['http-json'],
        maximumMessageBytes: 65_536,
        endpoints: {
          passport: `${origin}/ghostbridge/passport`,
          capabilities: `${origin}/ghostbridge/capabilities`,
          installGrantResolution: `${origin}/ghostbridge/install-grants/resolve`,
          installGrantRedemption: `${origin}/ghostbridge/install-grants/redeem`,
          invocations: `${origin}/ghostbridge/invocations`,
          tasks: `${origin}/ghostbridge/tasks/{taskId}`,
          receipts: `${origin}/ghostbridge/receipts/{receiptId}`,
          approvals: `${origin}/ghostbridge/approvals/{challengeId}/decisions`,
          revocations: `${origin}/ghostbridge/revocations/{subjectType}/{subjectReference}`,
          ...(trustRequired
            ? {
                issuerMetadata: `${origin}/.well-known/ghostbridge-issuer`,
                issuerJwks: `${origin}/.well-known/ghostbridge-jwks.json`,
              }
            : {}),
        },
        extensionNamespaces: [],
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/ghostbridge/passport') {
      send(response, 200, passport);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/ghostbridge/capabilities') {
      send(response, 200, { items: [capability] });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/fixture/bootstrap') {
      send(response, 200, {
        installGrant: grant.key,
        organizationScope,
        workspaceScope,
        hostAudience,
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/.well-known/ghostbridge-issuer') {
      if (!trustRequired) return safeError(response, 404, 'INVALID_MESSAGE', 'Not available.');
      send(response, 200, issuerMetadata);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/.well-known/ghostbridge-jwks.json') {
      if (!governed) return safeError(response, 404, 'INVALID_MESSAGE', 'Not available.');
      send(response, 200, jwks);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/.well-known/ghostbridge-revocations.json') {
      if (!trustRequired) return safeError(response, 404, 'INVALID_MESSAGE', 'Not available.');
      send(response, 200, revocationSet);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/negative/malformed-discovery') {
      send(response, 200, { protocol: 'not-ghostbridge' });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/negative/wrong-content-type') {
      send(response, 200, '{}', 'text/html');
      return;
    }
    if (request.method === 'GET' && url.pathname === '/negative/oversized') {
      send(response, 200, { padding: 'x'.repeat(70_000) });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/ghostbridge/install-grants/resolve') {
      const body = await readJson(request);
      if (body.grant !== grant.key) {
        return safeError(response, 401, 'INSTALL_GRANT_INVALID', 'The Install Grant is invalid.');
      }
      if (
        body.organizationScope !== organizationScope ||
        body.workspaceScope !== workspaceScope
      ) {
        return safeError(response, 409, 'SCOPE_MISMATCH', 'The Install Grant scope does not match.');
      }
      send(response, 200, {
        protocolVersion: PROTOCOL_VERSION,
        grantReference: grant.reference,
        passport,
        capabilities: [capability],
        connectionOffer: connectionOffer(origin),
        requestedScope: { organizationScope, workspaceScope },
        restrictions: [],
        expiresAt: grant.expiresAt,
        redemptionState: grant.redeemed ? 'redeemed' : 'available',
      });
      return;
    }
    if (
      request.method === 'POST' &&
      [
        '/ghostbridge/install-grants/redeem',
        '/ghostbridge/invocations',
      ].includes(url.pathname) &&
      !authenticated(request)
    ) {
      return safeError(
        response,
        401,
        'AUTHENTICATION_REQUIRED',
        'An authenticated Host principal is required.',
      );
    }
    if (request.method === 'POST' && url.pathname === '/ghostbridge/install-grants/redeem') {
      const body = await readJson(request);
      if (body.grant !== grant.key) {
        return safeError(response, 401, 'INSTALL_GRANT_INVALID', 'The Install Grant is invalid.');
      }
      if (grant.redeemed) {
        return safeError(
          response,
          409,
          'INSTALL_GRANT_ALREADY_REDEEMED',
          'The Install Grant was already redeemed.',
        );
      }
      if (
        body.organizationScope !== organizationScope ||
        body.workspaceScope !== workspaceScope
      ) {
        return safeError(response, 409, 'SCOPE_MISMATCH', 'The Install Grant scope does not match.');
      }
      if (!body.approvedCapabilityKeys?.includes(capabilityKey)) {
        return safeError(
          response,
          403,
          'AUTHORIZATION_DENIED',
          'The capability was not explicitly approved.',
        );
      }
      grant.redeemed = true;
      const connection = {
        connectionId: 'connection_black_box',
        agentId: passport.agentId,
        passportVersion: passport.passportVersion,
        organizationScope,
        workspaceScope,
        status: 'active',
        enabledCapabilityKeys: [capabilityKey],
      };
      connections.set(connection.connectionId, connection);
      send(response, 200, connection);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/ghostbridge/invocations') {
      const body = await readJson(request);
      const envelope = body.envelope;
      const connection = connections.get(body.connectionId);
      if (!connection || connectionRevoked) {
        return safeError(response, 409, 'CONNECTION_NOT_ACTIVE', 'The Connection is not active.');
      }
      if (envelope.protocolVersion !== PROTOCOL_VERSION) {
        return safeError(
          response,
          400,
          'UNSUPPORTED_PROTOCOL_VERSION',
          'The protocol version is unsupported.',
        );
      }
      if (
        envelope.organizationScope !== organizationScope ||
        envelope.workspaceScope !== workspaceScope
      ) {
        return safeError(response, 409, 'SCOPE_MISMATCH', 'The Invocation scope does not match.');
      }
      const fingerprint = digest({
        capabilityKey: envelope.capabilityKey,
        payload: envelope.payload,
      });
      if (envelope.idempotencyKey && idempotency.has(envelope.idempotencyKey)) {
        const prior = idempotency.get(envelope.idempotencyKey);
        if (prior.fingerprint !== fingerprint) {
          return safeError(
            response,
            409,
            'IDEMPOTENCY_CONFLICT',
            'The idempotency key was used for another request.',
          );
        }
        send(response, 200, { ...prior.result, idempotentReplay: true });
        return;
      }
      if (envelope.fixtureCancellation === true && envelope.payload?.mode === 'long') {
        const task = newTask(envelope.invocationId, 'running');
        tasks.set(task.taskId, task);
        send(response, 202, { task });
        return;
      }
      if (governed) {
        const decision = decisions.get(envelope.approvalReference);
        if (!decision || decision.used || decision.actionKey !== capabilityKey) {
          approvalChallenge ||= {
            challengeId: 'challenge_black_box',
            invocationId: envelope.invocationId,
            organizationScope,
            workspaceScope,
            actionKey: capabilityKey,
            safeSummary: 'Approve the echo fixture.',
            requiredRoleCategories: ['approver'],
            approvalLimits: {},
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            requestedBy: passport.agentId,
            policyDecisionReference: 'policy:black-box',
            status: 'pending',
          };
          const task = newTask(envelope.invocationId, 'waiting_for_approval');
          tasks.set(task.taskId, task);
          send(response, 202, { task, approvalChallenge });
          return;
        }
        decision.used = true;
      }
      const output = { echo: envelope.payload?.echo };
      const task = newTask(envelope.invocationId);
      const receipt = await executionReceipt(envelope, connection, task, output);
      task.receiptReference = receipt.receiptId;
      tasks.set(task.taskId, task);
      receipts.set(receipt.receiptId, { receipt, output });
      const result = { task, receipt, output, idempotentReplay: false };
      if (envelope.idempotencyKey) {
        idempotency.set(envelope.idempotencyKey, { fingerprint, result });
      }
      send(response, 200, result);
      return;
    }
    const taskMatch = /^\/ghostbridge\/tasks\/([^/]+)$/.exec(url.pathname);
    if (taskMatch) {
      if (!authenticated(request)) {
        return safeError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
      }
      const task = tasks.get(decodeURIComponent(taskMatch[1]));
      if (!task) return safeError(response, 404, 'TASK_NOT_FOUND', 'Task not found.');
      if (request.method === 'POST' && url.searchParams.get('action') === 'cancel') {
        const cancelled = {
          ...task,
          state: 'cancelled',
          safeProgressCategory: 'cancelled',
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          nextActionCategory: 'none',
        };
        tasks.set(cancelled.taskId, cancelled);
        send(response, 200, cancelled);
        return;
      }
      if (request.method === 'GET') {
        send(response, 200, task);
        return;
      }
    }
    const approvalMatch = /^\/ghostbridge\/approvals\/([^/]+)\/decisions$/.exec(url.pathname);
    if (request.method === 'POST' && approvalMatch) {
      if (!authenticated(request)) {
        return safeError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
      }
      const body = await readJson(request);
      if (
        !approvalChallenge ||
        body.challengeId !== approvalChallenge.challengeId ||
        approvalMatch[1] !== approvalChallenge.challengeId
      ) {
        return safeError(response, 409, 'APPROVAL_INVALID', 'Approval binding is invalid.');
      }
      const stored = {
        ...body,
        invocationId: approvalChallenge.invocationId,
        actionKey: approvalChallenge.actionKey,
        organizationScope,
        workspaceScope,
        expiresAt: approvalChallenge.expiresAt,
        used: false,
      };
      decisions.set(body.decisionId, stored);
      approvalChallenge.status = 'approved';
      send(response, 200, body);
      return;
    }
    const receiptMatch = /^\/ghostbridge\/receipts\/([^/]+)$/.exec(url.pathname);
    if (request.method === 'GET' && receiptMatch) {
      if (!authenticated(request)) {
        return safeError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
      }
      const record = receipts.get(decodeURIComponent(receiptMatch[1]));
      if (!record) return safeError(response, 404, 'INVALID_MESSAGE', 'Receipt not found.');
      send(response, 200, record);
      return;
    }
    const revocationMatch = /^\/ghostbridge\/revocations\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (revocationMatch) {
      if (!authenticated(request)) {
        return safeError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
      }
      if (request.method === 'POST') connectionRevoked = true;
      send(response, 200, {
        revocationId: 'revocation_black_box',
        subjectType: revocationMatch[1],
        subjectReference: revocationMatch[2],
        status: connectionRevoked ? 'revoked' : 'active',
        reasonCode: connectionRevoked ? 'OWNER_REVOKED' : 'NOT_REVOKED',
        effectiveAt: new Date().toISOString(),
        issuedBy: passport.issuer,
        freshness: 'fresh',
        sequence: 1,
      });
      return;
    }
    safeError(response, 404, 'INVALID_MESSAGE', 'The protocol resource was not found.');
  } catch (error) {
    safeError(
      response,
      error?.message === 'MESSAGE_TOO_LARGE' ? 413 : 400,
      error?.message === 'MESSAGE_TOO_LARGE' ? 'MESSAGE_TOO_LARGE' : 'INVALID_MESSAGE',
      'The protocol request could not be processed.',
    );
  }
});

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`${JSON.stringify({ port: server.address().port, profile })}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
