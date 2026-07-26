import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  PROTOCOL_VERSION,
  negotiateVersion,
  validateApprovalChallenge,
  validateApprovalDecision,
  validateCapabilityContract,
  validateConnectionOffer,
  validateContractValue,
  validateDiscovery,
  validateInvocation,
  validatePassport,
  validateReceipt,
  validateRevocation,
  validateTask,
} = require('@ghostbridge/protocol-core');
const {
  AntiRollbackStore,
  ReplayCache,
  evaluateTrustPolicy,
  revocationFreshness,
  validateIssuerMetadata,
  validateJwks,
  validateRevocationSet,
  verifyDocument,
  verifyReceipt,
} = require('@ghostbridge/trust');
const {
  createGhostBridgeClient,
} = require('@ghostbridge/native-client');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile =
  process.argv.find((value) => value.startsWith('--profile='))?.split('=')[1] || 'core';
assert.ok(['core', 'governed', 'trust'].includes(profile), 'Unknown conformance profile.');
const child = spawn(
  process.execPath,
  ['scripts/black-box/raw-agent.mjs', `--profile=${profile}`],
  {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);
const lines = readline.createInterface({ input: child.stdout });
const [firstLine] = await once(lines, 'line');
const startup = JSON.parse(firstLine);
const origin = `http://127.0.0.1:${startup.port}`;
const transcript = [];
let discovery;
let passport;
let capability;
let bootstrap;
let connection;
let lastInvocation;
let trustContext;

function safeEvidence(value = {}) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(
    serialized,
    /gb-install-|bearer |authorization|cookie|private.?key|refresh.?token|access.?token/i,
  );
  assert.ok(Buffer.byteLength(serialized, 'utf8') <= 2_000);
  return value;
}

async function check(testId, requirementReference, operation) {
  const startedAt = new Date().toISOString();
  try {
    const evidence = safeEvidence((await operation()) || {});
    transcript.push({
      profile,
      testId,
      requirementReference,
      status: 'pass',
      safeEvidence: evidence,
      hostProcessId: process.pid,
      agentProcessId: child.pid,
      protocolVersion: PROTOCOL_VERSION,
      startedAt,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorCode = String(
      error?.code || error?.errorCode || 'CHECK_FAILED',
    ).slice(0, 100);
    const safeMessage = String(
      error?.safeMessage || error?.message || 'Check failed.',
    ).slice(0, 300);
    transcript.push({
      profile,
      testId,
      requirementReference,
      status: 'fail',
      safeEvidence: {
        errorCode,
        safeMessage,
      },
      hostProcessId: process.pid,
      agentProcessId: child.pid,
      protocolVersion: PROTOCOL_VERSION,
      startedAt,
      completedAt: new Date().toISOString(),
    });
    process.stderr.write(
      `${JSON.stringify({
        conformanceFailure: true,
        profile,
        testId,
        requirementReference,
        errorCode,
        safeMessage,
      })}\n`,
    );
    if (error instanceof Error) {
      error.message = `[${testId}] ${requirementReference}: ${error.message}`;
      throw error;
    }
    throw new Error(
      `[${testId}] ${requirementReference}: ${safeMessage}`,
      { cause: error },
    );
  }
}

async function expectRejected(operation, codes) {
  let observed;
  try {
    await operation();
  } catch (error) {
    observed = error?.code || error?.errorCode || error?.body?.errorCode || 'REJECTED';
  }
  assert.ok(observed, 'The negative case was accepted.');
  if (codes) assert.ok(codes.includes(observed), `Unexpected rejection code: ${observed}`);
  return observed;
}

function corruptCompactJwsSignature(protectedJws) {
  const parts = String(protectedJws).split('.');
  assert.equal(parts.length, 3, 'The signed fixture must contain a compact JWS.');
  const signature = Buffer.from(parts[2], 'base64url');
  assert.ok(signature.length > 0, 'The signed fixture must contain signature bytes.');
  const corruptedSignature = Buffer.from(signature);
  corruptedSignature[0] ^= 0x01;
  assert.notDeepEqual(
    corruptedSignature,
    signature,
    'The negative fixture must alter the decoded signature bytes.',
  );
  parts[2] = corruptedSignature.toString('base64url');
  return parts.join('.');
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      accept: 'application/json',
      ...(options.auth ? { authorization: 'Bearer raw-host-fixture' } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: 'manual',
  });
  const contentType = String(response.headers.get('content-type') || '').split(';', 1)[0];
  if (options.requireJson !== false) assert.equal(contentType, 'application/json');
  const text = await readBounded(response, options.maximumBytes || 262_144);
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error('The peer returned malformed JSON.');
    error.code = 'INVALID_MESSAGE';
    throw error;
  }
  if (!response.ok && options.allowError !== true) {
    const error = new Error(body.safeMessage || 'Protocol request rejected.');
    error.code = body.errorCode || 'PROTOCOL_ERROR';
    error.body = body;
    throw error;
  }
  return { response, body };
}

function clientForNegativeDiscovery(pathname) {
  return createGhostBridgeClient({
    baseUrl: origin,
    localFixtureMode: true,
    allowedLocalOrigins: [origin],
    serverMode: false,
    fetch: async (url, options) => {
      const requested = new URL(url);
      if (requested.pathname === '/.well-known/ghostbridge') {
        return fetch(`${origin}${pathname}`, options);
      }
      return fetch(url, options);
    },
  });
}

async function readBounded(response, maximumBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    await response.body?.cancel();
    const error = new Error('Response exceeds the configured limit.');
    error.code = 'MESSAGE_TOO_LARGE';
    throw error;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        const error = new Error('Response exceeds the configured limit.');
        error.code = 'MESSAGE_TOO_LARGE';
        throw error;
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

function envelope(overrides = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: `invocation_${Math.random().toString(16).slice(2)}`,
    messageId: `message_${Math.random().toString(16).slice(2)}`,
    organizationScope: bootstrap.organizationScope,
    workspaceScope: bootstrap.workspaceScope,
    initiatingSubject: 'raw-host-user',
    targetAgentId: passport.agentId,
    targetPassportVersion: passport.passportVersion,
    capabilityKey: capability.capabilityKey,
    capabilityVersion: capability.capabilityVersion,
    inputContractReference: capability.inputContractReference,
    deadline: new Date(Date.now() + 30_000).toISOString(),
    payload: { echo: 'black-box' },
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
    ...(profile === 'core' ? {} : { idempotencyKey: `idempotency_${Math.random()}` }),
    ...overrides,
  };
}

async function runCoreMatrix() {
  await check('GB-C-DISCOVERY-001', '15.7 core discovery', async () => {
    discovery = (await jsonRequest('/.well-known/ghostbridge')).body;
    validateDiscovery(discovery);
    assert.equal(discovery.features.delegation, false);
    return { preferredVersion: discovery.preferredVersion };
  });
  await check('GB-C-VERSION-001', '15.7 version negotiation', async () => {
    const negotiated = negotiateVersion({
      remoteSupported: discovery.supportedVersions,
      remotePreferred: discovery.preferredVersion,
    });
    assert.equal(negotiated.selectedVersion, PROTOCOL_VERSION);
    return { selectedVersion: negotiated.selectedVersion };
  });
  await check('GB-C-PASSPORT-001', '15.7 Passport retrieval', async () => {
    passport = validatePassport((await jsonRequest('/ghostbridge/passport')).body);
    return { passportId: passport.passportId, status: passport.status };
  });
  await check('GB-C-CAPABILITY-001', '15.7 capability retrieval', async () => {
    const result = (await jsonRequest('/ghostbridge/capabilities')).body;
    assert.equal(result.items.length, 1);
    capability = validateCapabilityContract(result.items[0]);
    return { capabilityKey: capability.capabilityKey };
  });
  await check('GB-C-INSTALL-RESOLVE-001', '15.7 Install Grant resolution', async () => {
    bootstrap = (await jsonRequest('/fixture/bootstrap')).body;
    const resolution = (await jsonRequest('/ghostbridge/install-grants/resolve', {
      method: 'POST',
      body: {
        grant: bootstrap.installGrant,
        organizationScope: bootstrap.organizationScope,
        workspaceScope: bootstrap.workspaceScope,
      },
    })).body;
    validatePassport(resolution.passport);
    resolution.capabilities.forEach(validateCapabilityContract);
    validateConnectionOffer(resolution.connectionOffer);
    return {
      redemptionState: resolution.redemptionState,
      capabilityCount: resolution.capabilities.length,
    };
  });
  await check('GB-C-PROTECTED-001', '15.8 unauthorized protected route', async () => {
    const result = await jsonRequest('/ghostbridge/install-grants/redeem', {
      method: 'POST',
      body: {
        grant: bootstrap.installGrant,
        organizationScope: bootstrap.organizationScope,
        workspaceScope: bootstrap.workspaceScope,
        approvedCapabilityKeys: [capability.capabilityKey],
      },
      allowError: true,
    });
    assert.equal(result.response.status, 401);
    assert.equal(result.body.errorCode, 'AUTHENTICATION_REQUIRED');
    return { errorCode: result.body.errorCode };
  });
  await check('GB-C-INSTALL-REDEEM-001', '15.7 Connection creation', async () => {
    connection = (await jsonRequest('/ghostbridge/install-grants/redeem', {
      method: 'POST',
      auth: true,
      body: {
        grant: bootstrap.installGrant,
        organizationScope: bootstrap.organizationScope,
        workspaceScope: bootstrap.workspaceScope,
        approvedCapabilityKeys: [capability.capabilityKey],
      },
    })).body;
    assert.equal(connection.status, 'active');
    return { connectionId: connection.connectionId, status: connection.status };
  });
  await check('GB-C-GRANT-REUSE-001', '15.8 reused Install Grant', async () => {
    const code = await expectRejected(
      () => jsonRequest('/ghostbridge/install-grants/redeem', {
        method: 'POST',
        auth: true,
        body: {
          grant: bootstrap.installGrant,
          organizationScope: bootstrap.organizationScope,
          workspaceScope: bootstrap.workspaceScope,
          approvedCapabilityKeys: [capability.capabilityKey],
        },
      }),
      ['INSTALL_GRANT_ALREADY_REDEEMED'],
    );
    return { rejectedWith: code };
  });
  await check('GB-C-UNSUPPORTED-VERSION-001', '15.8 unsupported version', async () => {
    const code = await expectRejected(
      () => Promise.resolve(negotiateVersion({
        localSupported: [PROTOCOL_VERSION],
        remoteSupported: ['ghostbridge/99.0'],
        remotePreferred: 'ghostbridge/99.0',
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-C-MALFORMED-DISCOVERY-001', '15.8 malformed discovery', async () => {
    const malformed = (await jsonRequest('/negative/malformed-discovery')).body;
    const code = await expectRejected(() => Promise.resolve(validateDiscovery(malformed)));
    return { rejectedWith: code };
  });
  await check('GB-C-MISSING-ENDPOINT-001', '15.8 missing required endpoint', async () => {
    const client = clientForNegativeDiscovery('/negative/missing-endpoint-discovery');
    await client.discover();
    const code = await expectRejected(
      () => client.getPassport(),
      ['INVALID_MESSAGE'],
    );
    client.close();
    return { rejectedWith: code };
  });
  await check('GB-C-CROSS-ORIGIN-001', '15.8 cross-origin endpoint', async () => {
    const client = clientForNegativeDiscovery('/negative/cross-origin-discovery');
    await client.discover();
    const code = await expectRejected(
      () => client.getPassport(),
      ['INVALID_MESSAGE'],
    );
    client.close();
    return { rejectedWith: code };
  });
  await check('GB-C-WRONG-MEDIA-001', '15.8 wrong media type', async () => {
    const client = clientForNegativeDiscovery('/negative/wrong-content-type');
    const code = await expectRejected(() => client.discover());
    client.close();
    return { rejectedWith: code };
  });
  await check('GB-C-OVERSIZED-001', '15.8 oversized response', async () => {
    const code = await expectRejected(
      () => jsonRequest('/negative/oversized', { maximumBytes: 1_000 }),
      ['MESSAGE_TOO_LARGE'],
    );
    return { rejectedWith: code };
  });
  await check('GB-C-EXPIRED-PASSPORT-001', '15.8 expired Passport', async () => {
    const { proof: _proof, ...unsignedPassport } = passport;
    const expired = {
      ...unsignedPassport,
      expiresAt: new Date(Date.now() - 1).toISOString(),
    };
    const code = await expectRejected(() => Promise.resolve(validatePassport(expired)));
    return { rejectedWith: code };
  });

  if (profile === 'core') {
    await check('GB-C-INVOCATION-001', '15.7 invocation and Task lifecycle', async () => {
      const request = envelope();
      validateInvocation(request, { workspaceRequired: true });
      lastInvocation = (await jsonRequest('/ghostbridge/invocations', {
        method: 'POST',
        auth: true,
        body: { connectionId: connection.connectionId, envelope: request },
      })).body;
      validateTask(lastInvocation.task);
      validateReceipt(lastInvocation.receipt);
      validateContractValue(lastInvocation.output, capability.outputSchema, 'output');
      const fetched = (await jsonRequest(
        `/ghostbridge/tasks/${encodeURIComponent(lastInvocation.task.taskId)}`,
        { auth: true },
      )).body;
      validateTask(fetched);
      return {
        taskState: fetched.state,
        outputContract: 'valid',
        receiptOutcome: lastInvocation.receipt.outcome,
      };
    });
  }
  await check('GB-C-STABLE-ERROR-001', '15.7 stable protocol errors', async () => {
    const request = envelope({ protocolVersion: 'ghostbridge/99.0' });
    const result = await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: request },
      allowError: true,
    });
    assert.equal(result.body.errorCode, 'UNSUPPORTED_PROTOCOL_VERSION');
    assert.equal(typeof result.body.safeMessage, 'string');
    return { errorCode: result.body.errorCode };
  });
}

async function runGovernedMatrix() {
  let approvedEnvelope;
  await check('GB-G-APPROVAL-CHALLENGE-001', '15.7 Approval Challenge', async () => {
    approvedEnvelope = envelope({ invocationId: 'invocation_governed' });
    validateInvocation(approvedEnvelope, { workspaceRequired: true, sideEffecting: true });
    const waiting = (await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: approvedEnvelope },
    })).body;
    validateTask(waiting.task);
    validateApprovalChallenge(waiting.approvalChallenge);
    trustContext = { challenge: waiting.approvalChallenge };
    return { taskState: waiting.task.state, approvalRequired: true };
  });
  await check('GB-G-APPROVAL-BINDING-NEGATIVE-001', '15.7 Approval Challenge binding', async () => {
    const bad = {
      challengeId: 'challenge_other',
      decisionId: 'decision_wrong_action',
      decision: 'approved',
      approvedLimits: {},
      decidedBy: 'raw-host-approver',
      decidedAt: new Date().toISOString(),
      safeReasonCode: 'APPROVED',
    };
    const result = await jsonRequest(
      `/ghostbridge/approvals/${trustContext.challenge.challengeId}/decisions`,
      { method: 'POST', auth: true, body: bad, allowError: true },
    );
    assert.equal(result.body.errorCode, 'APPROVAL_INVALID');
    return { rejectedWith: result.body.errorCode };
  });
  await check('GB-G-APPROVAL-DECISION-001', '15.7 Approval Decision', async () => {
    const decision = {
      challengeId: trustContext.challenge.challengeId,
      decisionId: 'decision_governed',
      decision: 'approved',
      approvalActionDigest: trustContext.challenge.approvalActionDigest,
      approvedLimits: {},
      decidedBy: 'raw-host-approver',
      decidedAt: new Date().toISOString(),
      safeReasonCode: 'APPROVED',
    };
    validateApprovalDecision(decision, trustContext.challenge);
    await jsonRequest(
      `/ghostbridge/approvals/${trustContext.challenge.challengeId}/decisions`,
      { method: 'POST', auth: true, body: decision },
    );
    approvedEnvelope = { ...approvedEnvelope, approvalReference: decision.decisionId };
    trustContext.decision = decision;
    return { decision: 'approved' };
  });
  await check('GB-G-EXACT-ACTION-001', '15.7 exact-action binding', async () => {
    const substituted = {
      ...approvedEnvelope,
      payload: { echo: 'substituted-after-approval' },
    };
    const code = await expectRejected(
      () =>
        jsonRequest('/ghostbridge/invocations', {
          method: 'POST',
          auth: true,
          body: {
            connectionId: connection.connectionId,
            envelope: substituted,
          },
        }),
      ['APPROVAL_INVALID'],
    );
    return {
      rejectedWith: code,
      retainedApprovalReference: true,
      payloadSubstitutionRejected: true,
    };
  });
  await check('GB-G-INVOCATION-001', '15.7 governed invocation and signed Receipt', async () => {
    lastInvocation = (await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: approvedEnvelope },
    })).body;
    validateTask(lastInvocation.task);
    validateReceipt(lastInvocation.receipt);
    validateContractValue(lastInvocation.output, capability.outputSchema, 'output');
    trustContext.envelope = approvedEnvelope;
    const governedJwks = validateJwks(
      (await jsonRequest('/.well-known/ghostbridge-jwks.json')).body,
    );
    const receiptProof = verifyReceipt(lastInvocation.receipt, passport, governedJwks, {
      expectedAudience: bootstrap.hostAudience,
      actualOutput: lastInvocation.output,
      actualEvidence: {
        invocationId: approvedEnvelope.invocationId,
        taskId: lastInvocation.task.taskId,
        connectionId: connection.connectionId,
        capabilityKey: capability.capabilityKey,
        capabilityVersion: capability.capabilityVersion,
        organizationScope: bootstrap.organizationScope,
        workspaceScope: bootstrap.workspaceScope,
        outcome: 'completed',
      },
      invocation: { ...approvedEnvelope, connectionId: connection.connectionId },
    });
    assert.equal(receiptProof.valid, true);
    return {
      taskState: lastInvocation.task.state,
      receiptSigned: true,
    };
  });
  await check('GB-G-IDEMPOTENCY-001', '15.7 idempotency replay', async () => {
    const replay = (await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: approvedEnvelope },
    })).body;
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.task.taskId, lastInvocation.task.taskId);
    return { idempotentReplay: true };
  });
  await check('GB-G-IDEMPOTENCY-MISMATCH-001', '15.8 idempotency mismatch', async () => {
    const code = await expectRejected(
      () => jsonRequest('/ghostbridge/invocations', {
        method: 'POST',
        auth: true,
        body: {
          connectionId: connection.connectionId,
          envelope: { ...approvedEnvelope, payload: { echo: 'different' } },
        },
      }),
      ['IDEMPOTENCY_CONFLICT'],
    );
    return { rejectedWith: code };
  });
  await check('GB-G-DECISION-SINGLE-USE-001', '15.7 single-use Approval Decision', async () => {
    const second = {
      ...approvedEnvelope,
      invocationId: 'invocation_second_use',
      messageId: 'message_second_use',
      idempotencyKey: 'idempotency_second_use',
    };
    const result = (await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: second },
    })).body;
    assert.equal(result.task.state, 'waiting_for_approval');
    return { secondExecutionAuthorized: false };
  });
  await check('GB-G-SCOPE-MISMATCH-001', '15.8 scope mismatch', async () => {
    const changed = envelope({ organizationScope: 'org_other' });
    const code = await expectRejected(
      () => jsonRequest('/ghostbridge/invocations', {
        method: 'POST',
        auth: true,
        body: { connectionId: connection.connectionId, envelope: changed },
      }),
      ['SCOPE_MISMATCH'],
    );
    return { rejectedWith: code };
  });
  await check('GB-G-CANCELLATION-001', '15.7 cancellation', async () => {
    const long = envelope({
      invocationId: 'invocation_cancel_black_box',
      messageId: 'message_cancel_black_box',
      idempotencyKey: 'idempotency_cancel_black_box',
      payload: { echo: 'cancel', mode: 'long' },
      fixtureCancellation: true,
    });
    const accepted = (await jsonRequest('/ghostbridge/invocations', {
      method: 'POST',
      auth: true,
      body: { connectionId: connection.connectionId, envelope: long },
    })).body;
    const cancelled = (await jsonRequest(
      `/ghostbridge/tasks/${encodeURIComponent(accepted.task.taskId)}?action=cancel`,
      { method: 'POST', auth: true, body: {} },
    )).body;
    validateTask(cancelled);
    assert.equal(cancelled.state, 'cancelled');
    return { taskState: cancelled.state };
  });
}

async function runTrustMatrix() {
  await check('GB-T-ISSUER-001', '15.7 issuer metadata and JWKS', async () => {
    const metadata = validateIssuerMetadata(
      (await jsonRequest('/.well-known/ghostbridge-issuer')).body,
      {
        expectedIssuer: passport.issuer,
        localTestMode: true,
        allowedLocalIssuers: [passport.issuer],
      },
    );
    const keys = validateJwks(
      (await jsonRequest('/.well-known/ghostbridge-jwks.json')).body,
    );
    verifyDocument(metadata, keys, {
      purpose: 'issuer_metadata',
      expectedIssuer: passport.issuer,
    });
    verifyDocument(passport, keys, {
      purpose: 'passport_signing',
      expectedIssuer: passport.issuer,
    });
    trustContext.metadata = metadata;
    trustContext.jwks = keys;
    return {
      issuerVerified: true,
      keyCount: keys.keys.length,
      rootKeyCount: metadata.rootKeyThumbprints.length,
    };
  });
  await check('GB-T-ROOT-PIN-001', '15.7 root-key pin', async () => {
    const result = evaluateTrustPolicy({
      issuerId: passport.issuer,
      rootKeyThumbprint: trustContext.metadata.rootKeyThumbprints[0],
      organizationPolicy: {
        version: '1',
        allowedIssuerIds: [passport.issuer],
        blockedIssuerIds: [],
        pinnedRootThumbprints: [trustContext.metadata.rootKeyThumbprints[0]],
        unknownIssuerBehavior: 'block',
      },
    });
    assert.equal(result.category, 'verified_and_trusted');
    return { trustCategory: result.category };
  });
  await check('GB-T-RECEIPT-001', '15.7 Receipt verification and digest binding', async () => {
    const verified = verifyReceipt(lastInvocation.receipt, passport, trustContext.jwks, {
      expectedAudience: bootstrap.hostAudience,
      actualOutput: lastInvocation.output,
      actualEvidence: {
        invocationId: trustContext.envelope.invocationId,
        taskId: lastInvocation.task.taskId,
        connectionId: connection.connectionId,
        capabilityKey: capability.capabilityKey,
        capabilityVersion: capability.capabilityVersion,
        organizationScope: bootstrap.organizationScope,
        workspaceScope: bootstrap.workspaceScope,
        outcome: 'completed',
      },
      invocation: {
        ...trustContext.envelope,
        connectionId: connection.connectionId,
      },
    });
    assert.equal(verified.valid, true);
    return {
      proofValid: true,
      keyPurpose: verified.purpose,
      digestBinding: 'valid',
    };
  });
  await check('GB-T-WRONG-ISSUER-001', '15.8 wrong issuer', async () => {
    const changed = { ...passport, issuer: 'https://wrong.example' };
    const code = await expectRejected(
      () => Promise.resolve(verifyDocument(changed, trustContext.jwks, {
        purpose: 'passport_signing',
        expectedIssuer: passport.issuer,
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-T-WRONG-AUDIENCE-001', '15.8 wrong audience', async () => {
    const code = await expectRejected(
      () => Promise.resolve(verifyReceipt(lastInvocation.receipt, passport, trustContext.jwks, {
        expectedAudience: 'another-host',
        actualOutput: lastInvocation.output,
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-T-INVALID-SIGNATURE-001', '15.8 invalid signature', async () => {
    const changed = structuredClone(passport);
    changed.proof.protectedJws = corruptCompactJwsSignature(
      changed.proof.protectedJws,
    );
    const code = await expectRejected(
      () => Promise.resolve(verifyDocument(changed, trustContext.jwks, {
        purpose: 'passport_signing',
        expectedIssuer: passport.issuer,
      })),
      ['SIGNATURE_INVALID'],
    );
    return { rejectedWith: code };
  });
  await check('GB-T-UNSIGNED-OBJECT-001', '15.8 unsigned required object', async () => {
    const { proof: _proof, ...unsigned } = passport;
    const code = await expectRejected(
      () => Promise.resolve(verifyDocument(unsigned, trustContext.jwks, {
        purpose: 'passport_signing',
        expectedIssuer: passport.issuer,
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-T-UNSIGNED-RECEIPT-001', '15.8 unsigned Receipt', async () => {
    const { proof: _proof, ...unsigned } = lastInvocation.receipt;
    const code = await expectRejected(
      () => Promise.resolve(verifyReceipt(unsigned, passport, trustContext.jwks, {
        expectedAudience: bootstrap.hostAudience,
        actualOutput: lastInvocation.output,
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-T-RECEIPT-DIGEST-001', '15.8 Receipt digest mismatch', async () => {
    const code = await expectRejected(
      () => Promise.resolve(verifyReceipt(lastInvocation.receipt, passport, trustContext.jwks, {
        expectedAudience: bootstrap.hostAudience,
        actualOutput: { echo: 'different' },
      })),
    );
    return { rejectedWith: code };
  });
  await check('GB-T-REPLAY-001', '15.7 replay prevention', async () => {
    const cache = new ReplayCache();
    const descriptor = {
      issuer: passport.issuer,
      kid: 'host_key',
      messageId: 'message_replay_black_box',
      audience: passport.agentId,
      connectionId: connection.connectionId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    cache.consume(descriptor);
    const code = await expectRejected(() => Promise.resolve(cache.consume(descriptor)));
    return { rejectedWith: code };
  });
  await check('GB-T-REVOCATION-001', '15.7 revocation freshness and anti-rollback', async () => {
    const set = (await jsonRequest('/.well-known/ghostbridge-revocations.json')).body;
    const verified = validateRevocationSet(set, trustContext.jwks, {
      expectedIssuer: passport.issuer,
    });
    assert.equal(revocationFreshness(set), 'fresh');
    const rollback = new AntiRollbackStore();
    rollback.observe('revocation', passport.issuer, set.sequence + 1, verified.digest);
    const code = await expectRejected(
      () => Promise.resolve(
        rollback.observe('revocation', passport.issuer, set.sequence, 'sha256-other'),
      ),
    );
    return { freshness: 'fresh', rollbackRejectedWith: code };
  });
  await check('GB-T-STALE-REVOCATION-001', '15.8 stale revocation', async () => {
    const stale = {
      generatedAt: new Date(Date.now() - 120_000).toISOString(),
      nextUpdate: new Date(Date.now() - 60_000).toISOString(),
    };
    assert.equal(revocationFreshness(stale), 'stale');
    return { rejectedFreshness: 'stale' };
  });
  await check('GB-T-CONNECTION-REVOCATION-001', '15.7 Connection revocation', async () => {
    const result = (await jsonRequest(
      `/ghostbridge/revocations/connection/${encodeURIComponent(connection.connectionId)}`,
      { method: 'POST', auth: true, body: { reasonCode: 'OWNER_REVOKED' } },
    )).body;
    validateRevocation(result);
    assert.equal(result.status, 'revoked');
    return { status: result.status, sequence: result.sequence };
  });
}

try {
  await runCoreMatrix();
  if (profile !== 'core') await runGovernedMatrix();
  if (profile === 'trust') await runTrustMatrix();
} finally {
  child.kill('SIGTERM');
  await Promise.race([
    once(child, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

const report = {
  title: 'separate-process black-box conformance for the current JavaScript implementation',
  profile,
  protocolVersion: PROTOCOL_VERSION,
  hostProcessId: process.pid,
  agentProcessId: child.pid,
  separateProcesses: child.pid !== process.pid,
  startedAt: transcript[0]?.startedAt,
  completedAt: transcript.at(-1)?.completedAt,
  passed: transcript.length > 0 && transcript.every((item) => item.status === 'pass'),
  testCount: transcript.length,
  transcript,
};
const serializedReport = JSON.stringify(report);
assert.doesNotMatch(
  serializedReport,
  /gb-install-|bearer |authorization|cookie|private.?key|refresh.?token|access.?token/i,
);
process.stdout.write(`${serializedReport}\n`);
if (!report.passed) process.exitCode = 1;
