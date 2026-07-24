'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ReplayCache,
  digest,
  evaluateTrustPolicy,
  signRequest,
  validateCapabilityManifest,
  validateIssuerMetadata,
  validateJwks,
  validateRevocationSet,
  verifyDocument,
  verifyReceipt,
  verifyRequest,
  withoutProof,
} = require('@ghostbridge/trust');
const {
  LocalTestKeyProvider,
  createSyntheticIssuer,
} = require('../src');

const NOW = Date.parse('2026-07-24T10:00:00.000Z');
const clock = () => NOW;

async function fixture() {
  return createSyntheticIssuer({
    issuerId: 'http://127.0.0.1:8787',
    displayName: 'CodeForge Issuer',
    clock,
  });
}

test('local synthetic provider is non-exporting and prohibited in production', () => {
  assert.throws(() => new LocalTestKeyProvider({ mode: 'production' }));
  const provider = new LocalTestKeyProvider({ clock });
  const key = provider.createKey({ kid: 'test_key', purpose: ['passport_signing'] });
  assert.equal(key.d, undefined);
  assert.equal(JSON.stringify(key).includes('private'), false);
  assert.equal(provider.getKeyState(key.kid), 'generated');
});

test('issuer metadata and root proof verify from pinned public material', async () => {
  const { toolkit, keyIds } = await fixture();
  const metadata = await toolkit.createIssuerMetadata({
    rootKeyId: keyIds.root,
    expiresAt: '2026-07-24T11:00:00.000Z',
  });
  const jwks = validateJwks(toolkit.publishJwks());
  validateIssuerMetadata(metadata, {
    expectedIssuer: toolkit.issuerId,
    localTestMode: true,
    allowedLocalIssuers: [toolkit.issuerId],
    clock,
  });
  const proof = verifyDocument(metadata, jwks, {
    purpose: 'issuer_metadata',
    expectedIssuer: toolkit.issuerId,
    clock,
  });
  assert.equal(proof.valid, true);
  assert.equal(proof.kid, keyIds.root);
});

test('signed Passport binds signed Capability Manifest and execution key', async () => {
  const { toolkit, keyIds } = await fixture();
  const contract = {
    capabilityKey: 'codeforge.create_app',
    capabilityVersion: '1.0.0',
    riskCategory: 'moderate',
    sideEffectCategory: 'reversible_write',
    approvalRequirement: 'none',
    dataContractReference: 'schema:create-app@1',
    idempotencySupport: 'required',
    receiptRequirement: 'required',
  };
  const manifest = await toolkit.createCapabilityManifest(
    {
      agentId: 'codeforge-development-agent',
      passportId: 'passport_codeforge',
      passportVersion: '1.0.0',
      expiresAt: '2026-07-24T11:00:00.000Z',
    },
    [contract],
    keyIds.operational,
  );
  const passport = await toolkit.signPassport(
    {
      passportId: 'passport_codeforge',
      passportVersion: '1.0.0',
      agentId: 'codeforge-development-agent',
      issuer: toolkit.issuerId,
      issuedAt: '2026-07-24T10:00:00.000Z',
      expiresAt: '2026-07-24T11:00:00.000Z',
      status: 'active',
      supportedProfiles: ['ghostbridge.core', 'ghostbridge.governed-execution'],
      capabilityManifestDigest: digest(withoutProof(manifest)),
      supportedTransports: ['http-json'],
      authenticationDeclarations: ['signed_request'],
      dataDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: '/.well-known/ghostbridge-revocations.json',
      authorizedAgentExecutionKeys: [
        toolkit.authorizeAgentExecutionKey(keyIds.execution),
      ],
      extensionDeclarations: [],
    },
    keyIds.operational,
  );
  const jwks = toolkit.publishJwks();
  assert.equal(
    verifyDocument(passport, jwks, {
      purpose: 'passport_signing',
      expectedIssuer: toolkit.issuerId,
      clock,
    }).valid,
    true,
  );
  assert.equal(validateCapabilityManifest(manifest, [contract], passport, {
    jwks,
    clock,
  }).valid, true);
  assert.throws(
    () =>
      validateCapabilityManifest(
        manifest,
        [{ ...contract, riskCategory: 'low' }],
        passport,
        { jwks, clock },
      ),
    /Capability Contract/,
  );
});

test('signed installation objects enforce issuer and audience', async () => {
  const { toolkit, keyIds } = await fixture();
  const base = {
    issuer: toolkit.issuerId,
    audience: 'flowdesk-host',
    issuedAt: '2026-07-24T10:00:00.000Z',
    expiresAt: '2026-07-24T10:05:00.000Z',
    messageId: 'message_install_1',
    agentId: 'codeforge-development-agent',
    passportId: 'passport_codeforge',
    passportVersion: '1.0.0',
  };
  const resolution = await toolkit.signInstallResolution(
    {
      ...base,
      grantDigest: 'sha256-grant',
      capabilityManifestDigest: 'sha256-manifest',
      organizationScope: 'org_acme',
      workspaceScope: 'workspace_build',
      requestedCapabilitySet: ['codeforge.create_app'],
      connectionOfferDigest: 'sha256-offer',
      redemptionState: 'unredeemed',
    },
    keyIds.operational,
  );
  assert.equal(
    verifyDocument(resolution, toolkit.publishJwks(), {
      purpose: 'install_resolution_signing',
      expectedIssuer: toolkit.issuerId,
      expectedAudience: 'flowdesk-host',
      clock,
    }).valid,
    true,
  );
  assert.throws(
    () =>
      verifyDocument(resolution, toolkit.publishJwks(), {
        purpose: 'install_resolution_signing',
        expectedIssuer: toolkit.issuerId,
        expectedAudience: 'another-host',
        clock,
      }),
    /audience/,
  );
});

test('request integrity binds method, path, body, Connection, nonce, and replay state', async () => {
  const { toolkit, keyProvider, keyIds } = await fixture();
  const request = {
    method: 'POST',
    path: '/ghostbridge/invocations',
    body: { input: { projectName: 'Trust Demo' } },
    audience: 'codeforge-agent-runtime',
    connectionId: 'connection_1',
    protocolVersion: 'ghostbridge/0.1-draft',
    invocationId: 'invocation_1',
    messageId: 'request_1',
    issuedAt: '2026-07-24T10:00:00.000Z',
    expiresAt: '2026-07-24T10:05:00.000Z',
    nonce: 'nonce_connection_1',
    organizationScope: 'org_acme',
    workspaceScope: 'workspace_build',
  };
  const signed = await signRequest(request, keyProvider.signer(keyIds.execution));
  const replayCache = new ReplayCache({ clock });
  assert.equal(
    verifyRequest(request, signed, toolkit.publishJwks(), {
      purpose: 'request_signing',
      expectedAudience: request.audience,
      connectionId: request.connectionId,
      organizationScope: request.organizationScope,
      workspaceScope: request.workspaceScope,
      issuer: toolkit.issuerId,
      replayCache,
      clock,
    }).valid,
    true,
  );
  assert.throws(
    () =>
      verifyRequest(request, signed, toolkit.publishJwks(), {
        expectedAudience: request.audience,
        connectionId: request.connectionId,
        issuer: toolkit.issuerId,
        replayCache,
        clock,
      }),
    /already presented/,
  );
  assert.throws(
    () =>
      verifyRequest(
        { ...request, path: '/ghostbridge/other' },
        signed,
        toolkit.publishJwks(),
        { clock },
      ),
    /does not match/,
  );
});

test('signed revocation sets chain sequences and classify freshness', async () => {
  const { toolkit, keyIds } = await fixture();
  const first = await toolkit.signRevocationSet(
    {
      nextUpdate: '2026-07-24T10:10:00.000Z',
      entries: [
        {
          subjectType: 'passport',
          subjectReference: 'passport_old',
          status: 'revoked',
          reasonCode: 'SUPERSEDED',
          effectiveAt: '2026-07-24T10:00:00.000Z',
        },
      ],
    },
    keyIds.revocation,
  );
  const verification = validateRevocationSet(first, toolkit.publishJwks(), {
    expectedIssuer: toolkit.issuerId,
    clock,
  });
  assert.equal(verification.sequence, 1);
  assert.equal(verification.freshness, 'fresh');
  const second = await toolkit.signRevocationSet(
    {
      nextUpdate: '2026-07-24T10:10:00.000Z',
      entries: [],
    },
    keyIds.revocation,
  );
  assert.equal(second.previousSetDigest, digest(withoutProof(first)));
  assert.throws(
    () =>
      validateRevocationSet(first, toolkit.publishJwks(), {
        expectedIssuer: toolkit.issuerId,
        minimumSequence: 2,
        clock,
      }),
    /rollback/,
  );
});

test('overlapping rotation verifies old objects historically and blocks retired signing', async () => {
  const { toolkit, keyProvider, keyIds } = await fixture();
  const oldPassport = await toolkit.signPassport(
    {
      passportId: 'passport_rotation',
      passportVersion: '1.0.0',
      agentId: 'agent',
      issuer: toolkit.issuerId,
      issuedAt: '2026-07-24T10:00:00.000Z',
      expiresAt: '2026-07-24T11:00:00.000Z',
      status: 'active',
    },
    keyIds.operational,
  );
  const next = keyProvider.createKey({
    kid: 'test_operational_2',
    purpose: ['passport_signing'],
  });
  toolkit.prepublishKey(next.kid, 9);
  toolkit.beginRotation(keyIds.operational, next.kid, 10);
  const newPassport = await toolkit.signPassport(
    {
      ...withoutProof(oldPassport),
      passportVersion: '2.0.0',
      issuedAt: '2026-07-24T10:01:00.000Z',
    },
    next.kid,
  );
  assert.equal(
    verifyDocument(newPassport, toolkit.publishJwks(), {
      purpose: 'passport_signing',
      expectedIssuer: toolkit.issuerId,
      clock,
    }).kid,
    next.kid,
  );
  assert.equal(
    verifyDocument(oldPassport, toolkit.publishJwks(), {
      purpose: 'passport_signing',
      expectedIssuer: toolkit.issuerId,
      clock,
      historical: true,
    }).kid,
    keyIds.operational,
  );
  toolkit.retireKey(keyIds.operational, 11);
  await assert.rejects(
    toolkit.signPassport({ ...withoutProof(oldPassport), passportVersion: '3.0.0' }, keyIds.operational),
    /active authorized key/,
  );
});

test('Receipt verification requires the Passport-authorized execution key', async () => {
  const { toolkit, keyIds } = await fixture();
  const authorization = toolkit.authorizeAgentExecutionKey(keyIds.execution);
  const passport = {
    passportId: 'passport_codeforge',
    passportVersion: '1.0.0',
    agentId: 'codeforge-development-agent',
    issuer: toolkit.issuerId,
    authorizedAgentExecutionKeys: [authorization],
  };
  const receipt = await toolkit.signReceipt(
    {
      receiptId: 'receipt_1',
      invocationId: 'invocation_1',
      taskId: 'task_1',
      agentId: passport.agentId,
      passportId: passport.passportId,
      passportVersion: passport.passportVersion,
      agentExecutionKeyId: keyIds.execution,
      issuer: toolkit.issuerId,
      audience: 'flowdesk-host',
      issuedAt: '2026-07-24T10:00:10.000Z',
      expiresAt: '2026-07-24T11:00:00.000Z',
      messageId: 'receipt_message_1',
      capabilityKey: 'codeforge.create_app',
      capabilityVersion: '1.0.0',
      organizationScope: 'org_acme',
      workspaceScope: 'workspace_build',
      outcome: 'completed',
      startedAt: '2026-07-24T10:00:00.000Z',
      completedAt: '2026-07-24T10:00:10.000Z',
      attemptCount: 1,
      outputDigest: 'sha256-output',
      evidenceDigest: 'sha256-evidence',
      revocationStateAtExecution: 'fresh',
      trustProfileVersion: 'ghostbridge-trust/0.1-draft',
    },
    keyIds.execution,
  );
  const result = verifyReceipt(receipt, passport, toolkit.publishJwks(), {
    expectedAudience: 'flowdesk-host',
    clock,
  });
  assert.equal(result.historicalStatus, 'valid_at_issuance');
});

test('trust policy distinguishes cryptographic validity from host approval', async () => {
  const { toolkit } = await fixture();
  assert.equal(
    evaluateTrustPolicy({
      issuerId: toolkit.issuerId,
      organizationPolicy: { allowedIssuerIds: [toolkit.issuerId] },
    }).category,
    'verified_and_trusted',
  );
  assert.equal(
    evaluateTrustPolicy({
      issuerId: toolkit.issuerId,
      organizationPolicy: { allowedIssuerIds: [] },
    }).category,
    'cryptographically_valid_review_required',
  );
});
