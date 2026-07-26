'use strict';

const crypto = require('node:crypto');
const {
  DEFAULT_PROFILE_DECLARATIONS,
  PROTOCOL_VERSION,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('@ghostbridge/native-agent');
const { createSyntheticIssuer } = require('@ghostbridge/issuer');
const { digest, withoutProof } = require('@ghostbridge/trust');

const createAppInputSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['projectName', 'template'],
  properties: {
    projectName: { type: 'string', minLength: 1, maxLength: 100 },
    template: { enum: ['web', 'api', 'worker'] },
  },
});

const createAppOutputSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'projectName', 'template', 'state'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 200 },
    projectName: { type: 'string', minLength: 1, maxLength: 100 },
    template: { enum: ['web', 'api', 'worker'] },
    state: { const: 'created' },
  },
});

const createAppContract = Object.freeze({
  capabilityVersion: '1.0.0',
  displayName: 'Create application',
  safeDescription: 'Creates one deterministic synthetic application project.',
  inputContractReference: 'schema:codeforge.create-app-input@1',
  outputContractReference: 'schema:codeforge.create-app-output@1',
  inputSchema: createAppInputSchema,
  outputSchema: createAppOutputSchema,
  acceptedDataClasses: ['development.project_request'],
  producedDataClasses: ['development.project'],
  prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
  riskCategory: 'moderate',
  sideEffectCategory: 'reversible_write',
  idempotencySupport: 'required',
  asynchronousSupport: true,
  cancellationSupport: true,
  requiredPermissions: ['development.project.create'],
  approvalRequirement: 'none',
  delegationPolicy: { allowed: false },
  timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
  receiptRequirement: 'required',
  status: 'active',
});

function createCodeForgeProvider(options = {}) {
  const projects = new Map();
  const agent = createGhostBridgeAgent({
    mode: options.mode || 'localFixtureMode',
    approveAllFixtureCapabilities: options.approveAllFixtureCapabilities !== false,
    ...(options.publicBaseUrl ? { publicBaseUrl: options.publicBaseUrl } : {}),
    passport: options.passport || {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_codeforge_development_agent',
      passportVersion: '0.1.0',
      agentId: 'codeforge-development-agent',
      displayName: 'CodeForge Development Agent',
      safeDescription:
        'Creates deterministic synthetic application projects for the universal compatibility fixture.',
      issuer: 'codeforge-agent-provider.synthetic',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['codeforge.create_app'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      profiles: DEFAULT_PROFILE_DECLARATIONS,
      dataDeclarations: [
        {
          direction: 'input',
          dataClasses: ['development.project_request'],
        },
      ],
      delegationDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference:
        'revocations/passport/passport_codeforge_development_agent',
      documentationReferences: ['/docs/get-started/add-external-agent'],
      extensionDeclarations: [],
    },
    authenticationModes: ['signed_request'],
    authenticationSetupReference: 'ghostbridge:authentication/signed-request',
    ...(options.agentOptions || {}),
  });

  agent.capability('codeforge.create_app', {
    contract: createAppContract,
    handler: async ({ input, context }) => {
      const projectId = `project_${String(input.projectName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')}`;
      if (!projects.has(projectId)) {
        projects.set(projectId, {
          projectId,
          projectName: input.projectName,
          template: input.template,
          state: 'created',
          organizationScope: context.organizationScope,
          workspaceScope: context.workspaceScope,
        });
      }
      const { organizationScope, workspaceScope, ...publicProject } =
        projects.get(projectId);
      return { outcome: 'completed', output: publicProject };
    },
  });

  return {
    agent,
    issueInstallGrant(scope) {
      return agent.issueInstallGrant({
        ...scope,
        allowedCapabilityKeys: ['codeforge.create_app'],
      });
    },
    projectCount() {
      return projects.size;
    },
    async listen(options) {
      return agent.listen(options);
    },
  };
}

async function createTrustedCodeForgeProvider(options = {}) {
  const clock = options.clock || Date.now;
  const now = clock();
  const issuer = await createSyntheticIssuer({
    issuerId: options.issuerId || 'http://127.0.0.1:8787',
    displayName: 'CodeForge Issuer',
    clock,
  });
  const manifest = await issuer.toolkit.createCapabilityManifest(
    {
      agentId: 'codeforge-development-agent',
      passportId: 'passport_codeforge_development_agent',
      passportVersion: '1.0.0',
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 3_600_000).toISOString(),
    },
    [{ capabilityKey: 'codeforge.create_app', ...createAppContract }],
    issuer.keyIds.operational,
  );
  const passport = await issuer.toolkit.signPassport(
    {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_codeforge_development_agent',
      passportVersion: '1.0.0',
      agentId: 'codeforge-development-agent',
      displayName: 'CodeForge Development Agent',
      safeDescription: 'Creates deterministic synthetic application projects.',
      issuer: issuer.toolkit.issuerId,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 3_600_000).toISOString(),
      status: 'active',
      capabilities: ['codeforge.create_app'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      supportedProfiles: ['ghostbridge.core', 'ghostbridge.governed-execution'],
      profiles: DEFAULT_PROFILE_DECLARATIONS,
      capabilityManifestDigest: digest(withoutProof(manifest)),
      authenticationDeclarations: ['signed_request'],
      dataDeclarations: [{ direction: 'input', dataClasses: ['development.project_request'] }],
      delegationDeclarations: [],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: `${issuer.toolkit.issuerId}/.well-known/ghostbridge-revocations.json`,
      authorizedAgentExecutionKeys: [
        issuer.toolkit.authorizeAgentExecutionKey(issuer.keyIds.execution),
      ],
      documentationReferences: ['/docs/get-started/add-external-agent'],
      extensionDeclarations: [],
    },
    issuer.keyIds.operational,
  );
  const metadata = await issuer.toolkit.createIssuerMetadata({
    rootKeyId: issuer.keyIds.root,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 3_600_000).toISOString(),
  });
  const provider = createCodeForgeProvider({
    passport,
    agentOptions: {
      clock,
      hostAudience: options.hostAudience || 'flowdesk-host',
      capabilityManifest: manifest,
      agentSigner: issuer.keyProvider.signer(issuer.keyIds.execution),
      agentExecutionKeyId: issuer.keyIds.execution,
      receiptAudience: options.hostAudience || 'flowdesk-host',
      ...(options.requestIntegrity
        ? { requestIntegrity: options.requestIntegrity }
        : {}),
      connectionOfferSigner: (offer) =>
        issuer.toolkit.signConnectionOffer(offer, issuer.keyIds.operational),
      installResolutionSigner: (resolution) =>
        issuer.toolkit.signInstallResolution(resolution, issuer.keyIds.operational),
    },
  });
  const revocationSet = await issuer.toolkit.signRevocationSet(
    {
      generatedAt: new Date(now).toISOString(),
      nextUpdate: new Date(now + 300_000).toISOString(),
      entries: [],
    },
    issuer.keyIds.revocation,
  );
  return Object.freeze({
    ...provider,
    publicTrust: Object.freeze({
      metadata,
      jwks: issuer.toolkit.publishJwks(),
      passport,
      capabilityManifest: manifest,
      revocationSet,
    }),
    async rotateOperationalKey() {
      const next = issuer.keyProvider.createKey({
        kid: `test_operational_${cryptoRandomSuffix()}`,
        purpose: [
          'passport_signing',
          'capability_signing',
          'install_resolution_signing',
          'connection_offer_signing',
        ],
      });
      issuer.toolkit.prepublishKey(next.kid, issuer.toolkit.metadataSequence + 1);
      return issuer.toolkit.beginRotation(
        issuer.keyIds.operational,
        next.kid,
        issuer.toolkit.metadataSequence + 1,
      );
    },
    async revokeConnectionTrust(connectionId) {
      return issuer.toolkit.signRevocationSet(
        {
          nextUpdate: new Date(clock() + 300_000).toISOString(),
          entries: [{
            subjectType: 'connection',
            subjectReference: connectionId,
            status: 'revoked',
            reasonCode: 'REVOKED_BY_HOST',
            effectiveAt: new Date(clock()).toISOString(),
          }],
        },
        issuer.keyIds.revocation,
      );
    },
  });
}

function cryptoRandomSuffix() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
}

module.exports = {
  createAppInputSchema,
  createAppOutputSchema,
  createAppContract,
  createCodeForgeProvider,
  createTrustedCodeForgeProvider,
};
