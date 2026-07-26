'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const { isDeepStrictEqual } = require('node:util');
const {
  AUTHENTICATION_MODES,
  DEFAULT_LIMITS,
  DEFAULT_PROFILE_DECLARATIONS,
  GhostBridgeProtocolError,
  PROTOCOL_VERSION,
  approvalActionDigest,
  assertPlainData,
  boundedSerialize,
  digest,
  protocolError,
  transitionTask,
  validateApprovalChallenge,
  validateApprovalDecision,
  validateCapabilityContract,
  validateContractValue,
  validateInvocation,
  validatePassport,
  validateProtocolVersion,
  validateReceipt,
  validateRevocation,
  validateTask,
} = require('@ghostbridge/protocol-core');
const {
  ReplayCache,
  TRUST_PROFILE_VERSION,
  digest: trustDigest,
  signDocument,
  verifyReceipt: verifyTrustedReceipt,
  verifyRequest,
} = require('@ghostbridge/trust');
const { createFileProtocolStores } = require('./fileProtocolStores');

const AUDIT_EVENTS = Object.freeze([
  'protocol.discovery.requested',
  'protocol.passport.resolved',
  'protocol.passport.rejected',
  'protocol.install_grant.resolved',
  'protocol.install_grant.redeemed',
  'protocol.install_grant.rejected',
  'protocol.connection.created',
  'protocol.invocation.accepted',
  'protocol.invocation.rejected',
  'protocol.task.changed',
  'protocol.data_contract.rejected',
  'protocol.approval.requested',
  'protocol.approval.decided',
  'protocol.receipt.issued',
  'protocol.revocation.changed',
  'trust.request.verified',
  'trust.request.replay_rejected',
  'trust.receipt.signed',
]);

function createGhostBridgeAgent(options = {}) {
  const mode =
    options.mode ||
    (options.localFixtureMode === true ? 'localFixtureMode' : 'developmentMode');
  if (!['localFixtureMode', 'developmentMode', 'productionMode'].includes(mode)) {
    throw new TypeError('Agent mode must be localFixtureMode, developmentMode, or productionMode.');
  }
  const productionMode = mode === 'productionMode';
  if (productionMode && typeof options.authorization !== 'function') {
    throw new TypeError('Production mode requires an authorization handler.');
  }
  if (productionMode && typeof options.revocationResolver !== 'function') {
    throw new TypeError('Production mode requires a revocation resolver.');
  }
  if (productionMode && typeof options.receiptIssuer !== 'function') {
    throw new TypeError('Production mode requires an explicit Receipt issuer.');
  }
  if (productionMode && typeof options.authenticateHttpRequest !== 'function') {
    throw new TypeError('Production HTTP mode requires an authenticateHttpRequest handler.');
  }
  if (
    productionMode &&
    (!options.receiptVerificationJwks ||
      (!options.agentSigner && options.receiptIssuerGuaranteesSigned !== true))
  ) {
    throw new TypeError(
      'Production mode requires verifiable signed Receipt configuration.',
    );
  }
  const requiredProductionStores = [
    'installGrants',
    'connections',
    'tasks',
    'taskContexts',
    'receipts',
    'approvals',
    'approvalDecisions',
    'idempotency',
    'replay',
    'revocation',
    'terminalTransactions',
    'installGrantTransactions',
  ];
  if (
    productionMode &&
    requiredProductionStores.some((name) => !options.stores?.[name])
  ) {
    throw new TypeError('Production mode requires durable protocol stores.');
  }
  if (productionMode) {
    const storeMethods = {
      connections: ['values'],
      approvals: ['values'],
      approvalDecisions: ['putDecision', 'consumeApprovedDecision'],
      terminalTransactions: ['commitTerminal', 'recoverTerminalWrites'],
      installGrantTransactions: ['redeemInstallGrant'],
    };
    for (const name of requiredProductionStores) {
      if (name === 'terminalTransactions') {
        assertTerminalTransactionStore(options.stores[name]);
      } else if (name === 'installGrantTransactions') {
        assertInstallGrantTransactionStore(options.stores[name]);
      } else {
        assertDurableStore(options.stores[name], name, storeMethods[name]);
      }
    }
  }
  if (productionMode && !options.publicBaseUrl) {
    throw new TypeError('Production mode requires publicBaseUrl.');
  }
  let passport = validatePassport(options.passport, { clock: options.clock });
  let discoveryOverrides = options.discovery || {};
  let taskStore = options.stores?.tasks || options.taskStore || new Map();
  let receiptIssuer = options.receiptIssuer || defaultReceiptIssuer;
  let revocationResolver =
    options.revocationResolver ||
    (() => (mode === 'localFixtureMode' ? { status: 'active', freshness: 'fresh' } : { status: 'unknown' }));
  let authorizationHandler =
    options.authorization ||
    (() => ({ allowed: mode === 'localFixtureMode' }));
  let approvalHandler = options.approvalHandler;
  let logger = createSafeLogger(options.logger);
  let metricsSink = typeof options.metrics === 'function' ? options.metrics : () => undefined;
  const authenticationModes = Object.freeze([
    ...new Set(options.authenticationModes || ['none']),
  ]);
  if (
    !authenticationModes.length ||
    authenticationModes.some((mode) => !AUTHENTICATION_MODES.includes(mode))
  ) {
    throw new TypeError('Agent authentication modes are invalid.');
  }
  const clock = options.clock || Date.now;
  const requestIntegrity = options.requestIntegrity;
  const replayCache = requestIntegrity?.replayCache || new ReplayCache({ clock });
  const authenticateHttpRequest = options.authenticateHttpRequest;
  const fixtureHttpPrincipal = options.fixtureHttpPrincipal
    ? normalizeHttpPrincipal(options.fixtureHttpPrincipal, { allowWildcard: true })
    : undefined;
  if (options.agentSigner) {
    const unsignedReceiptIssuer = receiptIssuer;
    receiptIssuer = async (context) => {
      const receipt = await unsignedReceiptIssuer(context);
      const issuedAt = receipt.completedAt || new Date(clock()).toISOString();
      const signed = await signDocument(
        {
          ...receipt,
          passportId: context.passport.passportId,
          agentExecutionKeyId:
            options.agentExecutionKeyId ||
            context.passport.authorizedAgentExecutionKeys?.[0]?.kid,
          issuer: context.passport.issuer,
          audience:
            context.connection.hostAudience ||
            options.receiptAudience ||
            'ghostbridge-host',
          issuedAt,
          expiresAt:
            options.receiptExpiresAt ||
            new Date(Date.parse(issuedAt) + 86_400_000).toISOString(),
          messageId: `receipt_message_${receipt.receiptId}`,
          trustProfileVersion: TRUST_PROFILE_VERSION,
        },
        options.agentSigner,
        { purpose: 'execution_receipt_signing' },
      );
      audit('trust.receipt.signed', {
        receiptId: signed.receiptId,
        keyId: signed.agentExecutionKeyId,
      });
      return signed;
    };
  }
  const capabilities = new Map();
  const installGrants = options.stores?.installGrants || new Map();
  const connections = options.stores?.connections || new Map();
  const receipts = options.stores?.receipts || new Map();
  const taskContexts = options.stores?.taskContexts || new Map();
  const challenges = options.stores?.approvals || new Map();
  const decisions = options.stores?.approvalDecisions || new Map();
  const idempotency = options.stores?.idempotency || new Map();
  const terminalTransactions = options.stores?.terminalTransactions;
  const installGrantTransactions =
    options.stores?.installGrantTransactions;
  const activeExecutions = new Map();
  const terminalOperations = new Map();
  const metrics = new Map();
  const auditSink = typeof options.auditSink === 'function' ? options.auditSink : () => undefined;
  let runtimePublicBaseUrl = options.publicBaseUrl;
  let server;

  function metric(category, outcome) {
    const key = `${category}:${outcome}`;
    metrics.set(key, (metrics.get(key) || 0) + 1);
    metricsSink({ category, outcome, value: metrics.get(key) });
  }

  function audit(event, fields = {}) {
    if (!AUDIT_EVENTS.includes(event)) return;
    const safeFields = Object.fromEntries(
      Object.entries(fields)
        .filter(
          ([key, value]) =>
            value !== undefined &&
            !/(?:payload|input|output|credential|secret|token|policyRules)/i.test(key),
        )
        .slice(0, 20),
    );
    assertPlainData(safeFields);
    auditSink({
      event,
      occurredAt: new Date(clock()).toISOString(),
      fields: safeFields,
    });
  }

  const agent = {
    mode,
    legacyGrantPathEnabled:
      mode === 'localFixtureMode' && options.enableLegacyGrantPath === true,
    trustedInstallResolutionConfigured:
      typeof options.installResolutionSigner === 'function',
    configurePassport(nextPassport) {
      passport = validatePassport(nextPassport, { clock });
      return agent;
    },
    configureDiscovery(value) {
      discoveryOverrides = assertPlainData(value);
      return agent;
    },
    configureTaskStore(value) {
      if (productionMode) {
        assertDurableStore(value, 'tasks');
      } else if (
        !value ||
        typeof value.get !== 'function' ||
        (typeof value.put !== 'function' && typeof value.set !== 'function')
      ) {
        throw new TypeError('Task store must implement get() and put() or set().');
      }
      taskStore = value;
      return agent;
    },
    configureReceiptIssuer(value) {
      if (typeof value !== 'function') throw new TypeError('Receipt issuer must be a function.');
      receiptIssuer = value;
      return agent;
    },
    configureRevocationResolver(value) {
      if (typeof value !== 'function') throw new TypeError('Revocation resolver must be a function.');
      revocationResolver = value;
      return agent;
    },
    configureAuthorization(value) {
      if (typeof value !== 'function') throw new TypeError('Authorization handler must be a function.');
      authorizationHandler = value;
      return agent;
    },
    configureApprovalHandler(value) {
      if (typeof value !== 'function') throw new TypeError('Approval handler must be a function.');
      approvalHandler = value;
      return agent;
    },
    configureLogger(value) {
      logger = createSafeLogger(value);
      return agent;
    },
    configureMetrics(value) {
      if (typeof value !== 'function') throw new TypeError('Metrics sink must be a function.');
      metricsSink = value;
      return agent;
    },
    capability(capabilityKey, definition) {
      const normalized = normalizeCapabilityDefinition(capabilityKey, definition);
      const contract = validateCapabilityContract(normalized.contract);
      if (typeof definition.handler !== 'function') {
        throw new TypeError(`Capability ${capabilityKey} requires a handler.`);
      }
      capabilities.set(capabilityKey, { ...definition, ...normalized, contract });
      return agent;
    },
    registerCapability(capabilityKey, definition) {
      return agent.capability(capabilityKey, definition);
    },
    getDiscovery(baseUrl = '') {
      const prefix = String(
        runtimePublicBaseUrl ||
          (mode === 'localFixtureMode' ? baseUrl : ''),
      ).replace(/\/$/, '');
      if (!prefix) {
        throw protocolError(
          'INVALID_MESSAGE',
          'Agent discovery requires a configured publicBaseUrl.',
        );
      }
      const discovery = {
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
        profiles: {
          core: DEFAULT_PROFILE_DECLARATIONS.core,
          governedExecution: DEFAULT_PROFILE_DECLARATIONS.governedExecution,
        },
        transports: [new URL(prefix).protocol === 'https:' ? 'https-json' : 'http-json'],
        maximumMessageBytes: DEFAULT_LIMITS.maximumMessageBytes,
        endpoints: {
          passport: `${prefix}/ghostbridge/passport`,
          capabilities: `${prefix}/ghostbridge/capabilities`,
          capabilitySearch: `${prefix}/ghostbridge/capabilities/search`,
          capabilityDetails: `${prefix}/ghostbridge/capabilities/{capabilityKey}`,
          installGrantResolution: `${prefix}/ghostbridge/install-grants/resolve`,
          installGrantRedemption: `${prefix}/ghostbridge/install-grants/redeem`,
          invocations: `${prefix}/ghostbridge/invocations`,
          tasks: `${prefix}/ghostbridge/tasks/{taskId}`,
          receipts: `${prefix}/ghostbridge/receipts/{receiptId}`,
          approvals: `${prefix}/ghostbridge/approvals/{challengeId}/decisions`,
          revocations: `${prefix}/ghostbridge/revocations/{subjectType}/{subjectReference}`,
        },
        extensionNamespaces: [],
        ...discoveryOverrides,
      };
      metric('discovery', 'success');
      audit('protocol.discovery.requested', {
        protocolVersion: PROTOCOL_VERSION,
        outcome: 'success',
      });
      return discovery;
    },
    getPassport() {
      audit('protocol.passport.resolved', {
        protocolVersion: PROTOCOL_VERSION,
        status: passport.status,
      });
      return structuredClone(passport);
    },
    listCapabilities() {
      return [...capabilities.values()].map(({ contract }) => structuredClone(contract));
    },
    async searchCapabilities(options = {}) {
      const scope = capabilityScope(options);
      await authorizeCapabilityAccess(
        scope,
        undefined,
        'catalog',
        options.authenticatedPrincipal,
      );
      const queryTokens = tokenize(options.query);
      const allowedRisk = new Set(options.riskCategories || []);
      const allowedEffects = new Set(options.sideEffectCategories || []);
      const allowedAgents = new Set(options.agentIds || []);
      const limit = Math.max(1, Math.min(Number(options.limit) || 20, 50));
      const offset = decodeCursor(options.cursor);
      const rows = [];
      for (const { contract } of capabilities.values()) {
        if (contract.status !== 'active') continue;
        if (allowedRisk.size && !allowedRisk.has(contract.riskCategory)) continue;
        if (allowedEffects.size && !allowedEffects.has(contract.sideEffectCategory)) continue;
        if (allowedAgents.size && !allowedAgents.has(passport.agentId)) continue;
        const approvalRequired = contract.approvalRequirement === 'required';
        if (
          typeof options.approvalRequired === 'boolean' &&
          options.approvalRequired !== approvalRequired
        ) continue;
        const score = capabilityScore(contract, queryTokens);
        if (queryTokens.length && score === 0) continue;
        rows.push({
          agentDisplayName: passport.displayName,
          agentId: passport.agentId,
          capabilityKey: contract.capabilityKey,
          capabilityDisplayName: contract.displayName,
          safeDescription: contract.safeDescription,
          riskCategory: contract.riskCategory,
          sideEffectCategory: contract.sideEffectCategory,
          approvalRequired,
          conformanceLevel: contract.conformanceLevel || 'draft-level-1',
          availabilityState: 'available',
          score,
        });
      }
      rows.sort(
        (left, right) =>
          right.score - left.score ||
          left.capabilityKey.localeCompare(right.capabilityKey) ||
          left.agentId.localeCompare(right.agentId),
      );
      const items = rows.slice(offset, offset + limit).map(({ score, ...item }) => item);
      return {
        items,
        ...(offset + limit < rows.length ? { nextCursor: encodeCursor(offset + limit) } : {}),
        totalBounded: Math.min(rows.length, 10_000),
      };
    },
    async getCapabilityDetails(options = {}) {
      const scope = capabilityScope(options);
      await authorizeCapabilityAccess(
        scope,
        options.capabilityKey,
        'inspect',
        options.authenticatedPrincipal,
      );
      if (options.agentId && options.agentId !== passport.agentId) {
        throw protocolError('CAPABILITY_NOT_FOUND', 'The requested capability is not available.');
      }
      const registered = capabilities.get(options.capabilityKey);
      if (
        !registered ||
        registered.contract.status !== 'active' ||
        (options.capabilityVersion &&
          options.capabilityVersion !== registered.contract.capabilityVersion)
      ) {
        throw protocolError('CAPABILITY_NOT_FOUND', 'The requested capability is not available.');
      }
      return structuredClone(registered.contract);
    },
    issueInstallGrant(scope = {}) {
      if (!scope.organizationScope) {
        throw protocolError('SCOPE_REQUIRED', 'Organization scope is required.');
      }
      const grantId = `grant_${crypto.randomUUID()}`;
      const key = `gb-install-${crypto.randomBytes(18).toString('base64url')}`;
      const now = clock();
      const grant = {
        grantId,
        keyHash: digest({ key }),
        issuer: passport.issuer,
        agentId: passport.agentId,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + Math.min(scope.ttlMs || 300_000, 3_600_000)).toISOString(),
        status: 'active',
        restrictions: scope.restrictions || [],
        allowedCapabilityKeys:
          scope.allowedCapabilityKeys || [...capabilities.keys()],
      };
      if (productionMode) {
        return storePut(installGrants, grant.keyHash, grant).then(() => ({
          key,
          expiresAt: grant.expiresAt,
          grantReference: grantId,
        }));
      }
      installGrants.set(grant.keyHash, grant);
      return { key, expiresAt: grant.expiresAt, grantReference: grantId };
    },
    resolveInstallGrant(key, scope = {}) {
      const complete = (grant) => installResolution(grant, scope);
      const found = findGrant(key);
      return productionMode ? Promise.resolve(found).then(complete) : complete(found);
    },
    async resolveInstallGrantTrusted(key, scope = {}) {
      const resolution = await agent.resolveInstallGrant(key, scope);
      if (
        typeof options.connectionOfferSigner !== 'function' ||
        typeof options.installResolutionSigner !== 'function' ||
        !options.capabilityManifest
      ) {
        throw protocolError(
          'PROOF_REQUIRED',
          'Trusted installation requires configured manifest and signer providers.',
        );
      }
      const issuedAt = new Date(clock()).toISOString();
      const offerPayload = {
        ...resolution.connectionOffer,
        issuer: passport.issuer,
        passportId: passport.passportId,
        passportVersion: passport.passportVersion,
        supportedProtocolVersions: passport.supportedProtocolVersions,
        supportedTrustProfiles: [passport.trustProfileVersion || TRUST_PROFILE_VERSION],
        audience: options.hostAudience,
        allowedCapabilitySet: resolution.capabilities.map((item) => item.capabilityKey),
        issuedAt,
        messageId: `message_${resolution.connectionOffer.connectionOfferId}`,
        agentExecutionKeyReferences:
          passport.authorizedAgentExecutionKeys?.map((item) => item.kid) || [],
      };
      const signedOffer = await options.connectionOfferSigner(offerPayload);
      const trustedPayload = {
        ...resolution,
        issuer: passport.issuer,
        agentId: passport.agentId,
        passportId: passport.passportId,
        passportVersion: passport.passportVersion,
        capabilityManifest: options.capabilityManifest,
        capabilityManifestDigest: passport.capabilityManifestDigest,
        audience: options.hostAudience,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        requestedCapabilitySet: resolution.capabilities.map((item) => item.capabilityKey),
        connectionOffer: signedOffer,
        connectionOfferDigest: digest(signedOffer),
        issuedAt,
        messageId: `message_install_${resolution.grantReference}`,
        oneTimeRedemptionState: resolution.redemptionState,
      };
      return options.installResolutionSigner(trustedPayload);
    },
    redeemInstallGrant(key, scope = {}, requestContext = {}) {
      if (productionMode) {
        return redeemInstallGrantAtomically(key, scope, requestContext);
      }
      const complete = (grant) =>
        redeemInstallGrantRecord(grant, scope, requestContext);
      const found = findGrant(key);
      return complete(found);
    },
    issueApprovalChallenge(input) {
      const now = clock();
      const challenge = {
        challengeId: input.challengeId || `challenge_${crypto.randomUUID()}`,
        invocationId: input.invocationId,
        organizationScope: input.organizationScope,
        workspaceScope: input.workspaceScope,
        actionKey: input.actionKey,
        approvalActionDigest: input.approvalActionDigest,
        safeSummary: input.safeSummary || `Approve ${input.actionKey}`,
        requiredRoleCategories: input.requiredRoleCategories || ['approver'],
        approvalLimits: input.approvalLimits || {},
        expiresAt: input.expiresAt || new Date(now + 300_000).toISOString(),
        requestedBy: input.requestedBy || passport.agentId,
        policyDecisionReference: input.policyDecisionReference || 'policy:draft-default',
        status: 'pending',
      };
      validateApprovalChallenge(challenge);
      const complete = () => {
        metric('approval', 'requested');
        audit('protocol.approval.requested', {
          organizationScope: challenge.organizationScope,
          workspaceScope: challenge.workspaceScope,
          actionKey: challenge.actionKey,
        });
        return structuredClone(challenge);
      };
      if (productionMode) {
        return storePut(challenges, challenge.challengeId, challenge).then(complete);
      }
      challenges.set(challenge.challengeId, challenge);
      return complete();
    },
    submitApprovalDecision(decision, requestContext = {}) {
      if (productionMode) {
        return (async () => {
          const challenge = await storeGet(challenges, decision.challengeId);
          return submitApprovalDecisionForChallenge(
            challenge,
            decision,
            requestContext,
            true,
          );
        })();
      }
      return submitApprovalDecisionForChallenge(
        challenges.get(decision.challengeId),
        decision,
        requestContext,
        false,
      );
    },
    async invoke(connectionId, envelope, requestContext = {}) {
      validateProtocolVersion(envelope?.protocolVersion);
      const connection = await storeGet(connections, connectionId);
      if (!connection || connection.status !== 'active') {
        throw protocolError('CONNECTION_NOT_ACTIVE', 'The Agent Connection is not active.');
      }
      if (typeof options.requestIntegrityVerifier === 'function') {
        const result = await options.requestIntegrityVerifier({ connection, envelope });
        if (result !== true && result?.valid !== true) {
          throw protocolError('PROOF_INVALID', 'The Invocation request-integrity proof is invalid.');
        }
      } else if (requestIntegrity?.required === true || envelope.requestIntegrity) {
        if (!envelope.requestIntegrity?.request || !envelope.requestIntegrity?.signedRequest) {
          throw protocolError('PROOF_REQUIRED', 'The negotiated signed-request proof is required.');
        }
        try {
          verifyRequest(
            {
              ...envelope.requestIntegrity.request,
              body: envelope.payload,
              connectionId,
              invocationId: envelope.invocationId,
              organizationScope: envelope.organizationScope,
              ...(envelope.workspaceScope
                ? { workspaceScope: envelope.workspaceScope }
                : {}),
            },
            envelope.requestIntegrity.signedRequest,
            requestIntegrity.jwks,
            {
              ...requestIntegrity,
              expectedAudience: requestIntegrity.audience || passport.agentId,
              connectionId,
              organizationScope: connection.organizationScope,
              workspaceScope: connection.workspaceScope,
              replayCache,
              clock,
            },
          );
          audit('trust.request.verified', { connectionId, outcome: 'verified' });
          metric('request_integrity', 'verified');
        } catch (error) {
          audit('trust.request.replay_rejected', {
            connectionId,
            outcome: error?.code === 'REPLAY_DETECTED' ? 'replay' : 'invalid',
          });
          metric('request_integrity', error?.code === 'REPLAY_DETECTED' ? 'replay' : 'invalid');
          throw protocolError(
            error?.code || 'PROOF_INVALID',
            error?.safeMessage || 'The Invocation request-integrity proof is invalid.',
          );
        }
      }
      const revocation = await revocationResolver({
        subjectType: 'connection',
        subjectReference: connectionId,
        organizationScope: connection.organizationScope,
        workspaceScope: connection.workspaceScope,
      });
      if (revocation?.status === 'revoked') {
        throw protocolError('REVOKED', 'The Agent Connection has been revoked.');
      }
      if (productionMode) assertFreshConnectionRevocation(revocation, connection, passport);
      if (
        connection.organizationScope !== envelope.organizationScope ||
        (connection.workspaceScope && connection.workspaceScope !== envelope.workspaceScope)
      ) {
        throw protocolError('SCOPE_MISMATCH', 'The Invocation scope does not match the Connection.');
      }
      await authorizeCapabilityAccess(
        {
          organizationScope: envelope.organizationScope,
          workspaceScope: envelope.workspaceScope,
          connectionId,
          initiatingSubject: envelope.initiatingSubject,
        },
        envelope.capabilityKey,
        'invoke',
        requestContext.authenticatedPrincipal,
      );
      if (
        envelope.targetAgentId !== passport.agentId ||
        envelope.targetPassportVersion !== passport.passportVersion
      ) {
        throw protocolError('INVALID_PASSPORT', 'The Invocation targets a different Agent Passport.');
      }
      const registered = capabilities.get(envelope.capabilityKey);
      if (!registered || registered.contract.status !== 'active') {
        throw protocolError('CAPABILITY_NOT_FOUND', 'The requested capability is not available.');
      }
      if (!connection.enabledCapabilityKeys.includes(envelope.capabilityKey)) {
        throw protocolError(
          'AUTHORIZATION_DENIED',
          'The capability is disabled for this Agent Connection.',
        );
      }
      if (registered.contract.capabilityVersion !== envelope.capabilityVersion) {
        throw protocolError(
          'CAPABILITY_VERSION_MISMATCH',
          'The requested capability version is not supported.',
        );
      }
      if (
        registered.contract.inputContractReference !==
        envelope.inputContractReference
      ) {
        throw protocolError(
          'DATA_CONTRACT_VIOLATION',
          'The Invocation input contract does not match the capability contract.',
        );
      }
      validateInvocation(envelope, {
        clock,
        workspaceRequired: Boolean(connection.workspaceScope),
        sideEffecting: !['none', 'read'].includes(registered.contract.sideEffectCategory),
      });
      if (registered.contract.inputSchema) {
        validateContractValue(envelope.payload, registered.contract.inputSchema, 'input');
      }
      const idempotencyKey = envelope.idempotencyKey
        ? `${connection.organizationScope}|${connection.workspaceScope || ''}|${envelope.capabilityKey}|${envelope.idempotencyKey}`
        : undefined;
      const invocationDigest = digest({
        capabilityKey: envelope.capabilityKey,
        capabilityVersion: envelope.capabilityVersion,
        payload: envelope.payload,
      });
      if (idempotencyKey && await storeHas(idempotency, idempotencyKey)) {
        const recorded = await storeGet(idempotency, idempotencyKey);
        if (recorded.digest !== invocationDigest) {
          throw protocolError(
            'IDEMPOTENCY_CONFLICT',
            'The idempotency key was already used for a different Invocation.',
          );
        }
        return structuredClone({ ...recorded.result, idempotentReplay: true });
      }

      if (registered.delegationRequired || envelope.delegationReference) {
        throw protocolError(
          'DELEGATION_REQUIRED',
          'Direct Agent Coordination is not available on the Native Agent surface.',
        );
      }

      if (registered.contract.approvalRequirement === 'required') {
        const candidateDecision = envelope.approvalReference
          ? await storeGet(decisions, envelope.approvalReference)
          : undefined;
        let actualApprovalActionDigest;
        if (candidateDecision) {
          try {
            actualApprovalActionDigest = approvalActionDigestForInvocation({
              connection,
              envelope,
              registered,
              approvalLimits: registered.approvalLimits || {},
              policyDecisionReference:
                candidateDecision.policyDecisionReference ||
                registered.policyDecisionReference ||
                'policy:draft-default',
              validityBoundary: candidateDecision.expiresAt,
            });
          } catch {
            actualApprovalActionDigest = undefined;
          }
        }
        const decision = await consumeApprovalDecision({
          decisionId: envelope.approvalReference,
          invocationId: envelope.invocationId,
          actionKey: envelope.capabilityKey,
          approvalActionDigest: actualApprovalActionDigest,
          organizationScope: envelope.organizationScope,
          workspaceScope: envelope.workspaceScope,
          now: new Date(clock()).toISOString(),
        });
        if (!decision) {
          const approvalLimits = registered.approvalLimits || {};
          const policyDecisionReference =
            registered.policyDecisionReference || 'policy:draft-default';
          const challengeCandidates = await storeValues(challenges);
          const existing = challengeCandidates.find((item) => {
            if (
              item.invocationId !== envelope.invocationId ||
              item.actionKey !== envelope.capabilityKey ||
              item.status !== 'pending'
            ) {
              return false;
            }
            try {
              return item.approvalActionDigest === approvalActionDigestForInvocation({
                connection,
                envelope,
                registered,
                approvalLimits,
                policyDecisionReference,
                validityBoundary: item.expiresAt,
              });
            } catch {
              return false;
            }
          });
          const expiresAt = new Date(clock() + 300_000).toISOString();
          const challenge =
            existing ||
            await agent.issueApprovalChallenge({
              invocationId: envelope.invocationId,
              organizationScope: envelope.organizationScope,
              workspaceScope: envelope.workspaceScope,
              actionKey: envelope.capabilityKey,
              approvalActionDigest: approvalActionDigestForInvocation({
                connection,
                envelope,
                registered,
                approvalLimits,
                policyDecisionReference,
                validityBoundary: expiresAt,
              }),
              safeSummary: `Approve ${registered.contract.displayName}`,
              requiredRoleCategories: ['finance_manager'],
              approvalLimits,
              policyDecisionReference,
              expiresAt,
            });
          if (approvalHandler) {
            await approvalHandler(structuredClone(challenge));
          }
          const task = createTask(envelope, registered.contract, clock, 'waiting_for_approval');
          const taskEnvelope = {
            ...envelope,
            approvalReference: challenge.challengeId,
          };
          await storePut(taskStore, task.taskId, task);
          await storePut(
            taskContexts,
            task.taskId,
            createTaskReceiptContext({
              connection,
              envelope: taskEnvelope,
              contract: registered.contract,
              task,
              passport,
            }),
          );
          return { task: structuredClone(task), approvalChallenge: structuredClone(challenge) };
        }
      }

      const task = createTask(envelope, registered.contract, clock);
      const receiptContext = createTaskReceiptContext({
        connection,
        envelope,
        contract: registered.contract,
        task,
        passport,
      });
      await storePut(taskStore, task.taskId, task);
      await storePut(taskContexts, task.taskId, receiptContext);
      audit('protocol.invocation.accepted', {
        organizationScope: envelope.organizationScope,
        workspaceScope: envelope.workspaceScope,
        capabilityKey: envelope.capabilityKey,
      });
      audit('protocol.task.changed', {
        organizationScope: envelope.organizationScope,
        workspaceScope: envelope.workspaceScope,
        state: task.state,
      });
      const latestAcceptedTask = await storeGet(taskStore, task.taskId);
      if (latestAcceptedTask?.state === 'cancelled') {
        throw protocolError('TASK_CANCELLED', 'Capability execution was cancelled.');
      }
      const running = transitionTask(task, 'running', new Date(clock()).toISOString());
      await storePut(taskStore, task.taskId, running);
      let executionRecord;
      try {
        const abortController = new AbortController();
        executionRecord = {
          abortController,
          connection,
          envelope,
          contract: registered.contract,
          receiptContext,
          cancellationRequested: false,
          cancellationPromise: undefined,
        };
        activeExecutions.set(running.taskId, executionRecord);
        const deadlineMs = Math.max(1, Date.parse(envelope.deadline) - clock());
        const configuredTimeout = Number(registered.contract.timeoutBounds?.maximumMs) || deadlineMs;
        const timeoutMs = Math.min(deadlineMs, configuredTimeout);
        const timeout = setTimeout(
          () => abortController.abort(new Error('Capability deadline exceeded.')),
          timeoutMs,
        );
        const handlerPromise = registered.handler({
          input: structuredClone(envelope.payload),
          context: {
            invocationId: envelope.invocationId,
            taskId: running.taskId,
            organizationScope: envelope.organizationScope,
            workspaceScope: envelope.workspaceScope,
            initiatingSubject: envelope.initiatingSubject,
            deadline: envelope.deadline,
            idempotencyKey: envelope.idempotencyKey,
            traceContext: envelope.traceContext,
            approvalReference: envelope.approvalReference,
            signal: abortController.signal,
            logger,
          },
        });
        let result;
        try {
          result = await Promise.race([
            handlerPromise,
            new Promise((_, reject) => {
              abortController.signal.addEventListener(
                'abort',
                () =>
                  reject(
                    protocolError('DEADLINE_EXCEEDED', 'The capability execution deadline elapsed.'),
                  ),
                { once: true },
              );
            }),
          ]);
        } finally {
          clearTimeout(timeout);
          activeExecutions.delete(running.taskId);
        }
        if (abortController.signal.aborted) {
          throw protocolError('TASK_CANCELLED', 'Capability execution was cancelled.');
        }
        if (registered.contract.outputSchema) {
          validateContractValue(result.output, registered.contract.outputSchema, 'output');
        }
        const completed = transitionTask(running, 'completed', new Date(clock()).toISOString());
        const receipt = await issueExecutionReceipt({
          contract: registered.contract,
          connection,
          envelope,
          task: completed,
          outcome: result.outcome || 'completed',
          output: result.output,
        });
        completed.receiptReference = receipt.receiptId;
        completed.nextActionCategory = 'none';
        await persistTerminalExecution({
          task: completed,
          receipt,
          expectedTaskStates: ['running'],
        });
        const response = {
          task: structuredClone(completed),
          receipt: structuredClone(receipt),
          output: structuredClone(result.output),
          idempotentReplay: false,
        };
        if (idempotencyKey) {
          await storePut(idempotency, idempotencyKey, {
            digest: invocationDigest,
            result: response,
          });
        }
        metric('invocation', 'completed');
        metric('receipt', 'issued');
        audit('protocol.task.changed', {
          organizationScope: envelope.organizationScope,
          workspaceScope: envelope.workspaceScope,
          state: completed.state,
        });
        audit('protocol.receipt.issued', {
          organizationScope: envelope.organizationScope,
          workspaceScope: envelope.workspaceScope,
          outcome: receipt.outcome,
        });
        return response;
      } catch (error) {
        if (executionRecord?.cancellationRequested) {
          await executionRecord.cancellationPromise;
          throw protocolError('TASK_CANCELLED', 'Capability execution was cancelled.');
        }
        const persistedTask = await storeGet(taskStore, running.taskId);
        if (persistedTask?.state === 'cancelled') {
          throw protocolError('TASK_CANCELLED', 'Capability execution was cancelled.');
        }
        const terminalState =
          error instanceof GhostBridgeProtocolError &&
          error.errorCode === 'DEADLINE_EXCEEDED'
            ? 'timed_out'
            : 'failed';
        const failed = transitionTask(
          running,
          terminalState,
          new Date(clock()).toISOString(),
        );
        failed.safeFailureCode =
          error instanceof GhostBridgeProtocolError ? error.errorCode : 'INTERNAL_ERROR';
        failed.nextActionCategory = 'inspect';
        try {
          const failureReceipt = await issueExecutionReceipt({
            contract: registered.contract,
            connection,
            envelope,
            task: failed,
            outcome: terminalState,
            output: undefined,
            safeFailureCode: failed.safeFailureCode,
          });
          failed.receiptReference = failureReceipt.receiptId;
          await persistTerminalExecution({
            task: failed,
            receipt: failureReceipt,
            expectedTaskStates: ['running'],
          });
        } catch (receiptError) {
          if (productionMode) throw receiptError;
        }
        if (!productionMode && !failed.receiptReference) {
          await storePut(taskStore, failed.taskId, failed);
        }
        metric('invocation', 'failed');
        if (error instanceof GhostBridgeProtocolError) throw error;
        throw protocolError(
          'INTERNAL_ERROR',
          'The capability execution failed without exposing implementation details.',
        );
      }
    },
    getTask(taskId) {
      if (productionMode) {
        return storeGet(taskStore, taskId).then((task) => requireTask(task));
      }
      return requireTask(taskStore.get(taskId));
    },
    async cancelTask(taskId) {
      const task = await agent.getTask(taskId);
      if (task.state === 'cancelled' && task.receiptReference) {
        return structuredClone(task);
      }
      if (!task.cancellationSupported || !['accepted', 'queued', 'running', 'waiting_for_approval'].includes(task.state)) {
        throw protocolError('TASK_NOT_CANCELLABLE', 'The Execution Task cannot be cancelled.');
      }
      if (terminalOperations.has(taskId)) {
        return structuredClone(await terminalOperations.get(taskId));
      }
      const execution = activeExecutions.get(taskId);
      const cancellation = (async () => {
        const receiptContext =
          execution?.receiptContext || await storeGet(taskContexts, taskId);
        if (!receiptContext) {
          throw protocolError(
            'PROOF_REQUIRED',
            'Cancellation could not load its bounded Receipt context.',
          );
        }
        const cancelled = transitionTask(task, 'cancelled', new Date(clock()).toISOString());
        cancelled.safeFailureCode = 'TASK_CANCELLED';
        const receipt = await issueExecutionReceipt({
          contract: receiptContext.contract,
          connection: receiptContext.connection,
          envelope: receiptContext.envelope,
          task: cancelled,
          outcome: 'cancelled',
          output: undefined,
          safeFailureCode: 'TASK_CANCELLED',
        });
        cancelled.receiptReference = receipt.receiptId;
        await persistTerminalExecution({
          task: cancelled,
          receipt,
          expectedTaskStates: [task.state],
        });
        return cancelled;
      })();
      terminalOperations.set(taskId, cancellation);
      if (execution) {
        execution.cancellationRequested = true;
        execution.cancellationPromise = cancellation;
        execution.abortController.abort(
          new Error('Capability execution was cancelled by the Host.'),
        );
      }
      try {
        return structuredClone(await cancellation);
      } finally {
        terminalOperations.delete(taskId);
      }
    },
    getReceipt(receiptId) {
      if (productionMode) {
        return storeGet(receipts, receiptId).then((receipt) => requireReceipt(receipt));
      }
      return requireReceipt(receipts.get(receiptId));
    },
    checkRevocation(subjectType, subjectReference) {
      if (typeof subjectReference !== 'string' || !subjectReference.trim()) {
        throw protocolError(
          'INVALID_MESSAGE',
          'A revocation subject reference is required.',
        );
      }
      if (subjectType === 'connection') {
        if (productionMode) {
          return storeGet(connections, subjectReference).then((connection) =>
            connectionRevocation(connection, subjectReference, passport, clock),
          );
        }
        return connectionRevocation(
          connections.get(subjectReference),
          subjectReference,
          passport,
          clock,
        );
      }
      return {
        revocationId: `revocation_${subjectReference}`,
        subjectType,
        subjectReference,
        status: 'active',
        reasonCode: 'NOT_REVOKED',
        effectiveAt: new Date(clock()).toISOString(),
        issuedBy: passport.issuer,
      };
    },
    revokeConnection(connectionId, reasonCode = 'OWNER_REVOKED') {
      const revoke = (connection) => {
        if (!connection) {
          throw protocolError(
            'CONNECTION_NOT_ACTIVE',
            'The Agent Connection was not found.',
          );
        }
        const revoked = {
          ...connection,
          status: 'revoked',
          revokedAt: new Date(clock()).toISOString(),
          revocationReasonCode: reasonCode,
        };
        const complete = () => {
          metric('revocation', 'revoked');
          audit('protocol.revocation.changed', {
            organizationScope: revoked.organizationScope,
            workspaceScope: revoked.workspaceScope,
            subjectType: 'connection',
            status: 'revoked',
          });
          return connectionRevocation(revoked, connectionId, passport, clock);
        };
        if (productionMode) return storePut(connections, connectionId, revoked).then(complete);
        connections.set(connectionId, revoked);
        return complete();
      };
      if (productionMode) return storeGet(connections, connectionId).then(revoke);
      return revoke(connections.get(connectionId));
    },
    getMetrics() {
      return [...metrics.entries()].map(([key, value]) => {
        const [category, outcome] = key.split(':');
        return { category, outcome, value };
      });
    },
    getConnectionCount() {
      if (productionMode) return storeValues(connections).then((items) => items.length);
      return connections.size;
    },
    async listen(listenOptions = {}) {
      if (server) throw new Error('Ghost Bridge agent is already listening.');
      server = http.createServer((request, response) =>
        handleHttp(agent, request, response, {
          authenticate: authenticateProtocolHttpRequest,
          scopeFor: protocolHttpScope,
        }),
      );
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(listenOptions.port ?? 0, listenOptions.host || '127.0.0.1', resolve);
      });
      const address = server.address();
      const baseUrl = `http://${address.address.includes(':') ? `[${address.address}]` : address.address}:${address.port}`;
      if (mode === 'localFixtureMode' && !runtimePublicBaseUrl) runtimePublicBaseUrl = baseUrl;
      return {
        baseUrl,
        address,
        close: () => agent.close(),
      };
    },
    async close() {
      if (!server) return;
      const activeServer = server;
      server = undefined;
      await new Promise((resolve, reject) =>
        activeServer.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };

  async function authenticateProtocolHttpRequest(request, operation, routeParameters = {}) {
    if (mode === 'localFixtureMode' && fixtureHttpPrincipal) return fixtureHttpPrincipal;
    if (typeof authenticateHttpRequest !== 'function') {
      throw protocolError(
        'AUTHENTICATION_REQUIRED',
        'An authenticated Host principal is required for this protocol operation.',
      );
    }
    let result;
    try {
      result = await authenticateHttpRequest({
        request,
        operation,
        routeParameters: structuredClone(routeParameters),
        headers: Object.freeze({ ...request.headers }),
      });
    } catch {
      throw protocolError(
        'AUTHENTICATION_REQUIRED',
        'Host request authentication failed.',
      );
    }
    try {
      return normalizeHttpPrincipal(result, { allowWildcard: mode === 'localFixtureMode' });
    } catch {
      throw protocolError(
        'AUTHENTICATION_REQUIRED',
        'Host request authentication failed.',
      );
    }
  }

  async function protocolHttpScope(operation, parameters = {}) {
    if (operation === 'install_grant_redemption') {
      return {
        organizationScope: parameters.body?.organizationScope,
        workspaceScope: parameters.body?.workspaceScope,
      };
    }
    if (operation === 'invocation') {
      const connection = await storeGet(connections, parameters.body?.connectionId);
      return connection
        ? {
            organizationScope: connection.organizationScope,
            workspaceScope: connection.workspaceScope,
          }
        : {};
    }
    if (['task_lookup', 'task_cancellation'].includes(operation)) {
      const taskContext = await storeGet(taskContexts, parameters.taskId);
      return taskContext
        ? {
            organizationScope: taskContext.organizationScope,
            workspaceScope: taskContext.workspaceScope,
          }
        : {};
    }
    if (operation === 'receipt_lookup') {
      const receipt = await storeGet(receipts, parameters.receiptId);
      return receipt
        ? {
            organizationScope: receipt.organizationScope,
            workspaceScope: receipt.workspaceScope,
          }
        : {};
    }
    if (operation === 'approval_decision') {
      const challenge = await storeGet(challenges, parameters.challengeId);
      return challenge
        ? {
            organizationScope: challenge.organizationScope,
            workspaceScope: challenge.workspaceScope,
          }
        : {};
    }
    if (['revocation_lookup', 'connection_revocation'].includes(operation)) {
      const connection =
        parameters.subjectType === 'connection'
          ? await storeGet(connections, parameters.subjectReference)
          : undefined;
      return connection
        ? {
            organizationScope: connection.organizationScope,
            workspaceScope: connection.workspaceScope,
          }
        : {};
    }
    return {
      organizationScope: parameters.organizationScope,
      workspaceScope: parameters.workspaceScope,
    };
  }

  async function authorizeCapabilityAccess(
    scope,
    capabilityKey,
    action,
    authenticatedPrincipal,
  ) {
    if (!scope.organizationScope) {
      throw protocolError('SCOPE_REQUIRED', 'Organization scope is required.');
    }
    const activeConnection = (await storeValues(connections)).find(
      (connection) =>
        connection.status === 'active' &&
        connection.organizationScope === scope.organizationScope &&
        (!connection.workspaceScope || connection.workspaceScope === scope.workspaceScope),
    );
    if (!activeConnection && action !== 'invoke') {
      throw protocolError('CONNECTION_NOT_ACTIVE', 'An active scoped Agent Connection is required.');
    }
    let decision;
    try {
      decision = await withAuthorizationDeadline(
        authorizationHandler({
          action,
          capabilityKey,
          organizationScope: scope.organizationScope,
          workspaceScope: scope.workspaceScope,
          connectionId: scope.connectionId || activeConnection?.connectionId,
          initiatingSubject: scope.initiatingSubject,
          authenticatedPrincipal,
        }),
        options.authorizationTimeoutMs,
      );
    } catch {
      throw protocolError(
        'AUTHORIZATION_DENIED',
        'The capability authorization decision was unavailable.',
      );
    }
    if (
      mode === 'localFixtureMode' &&
      (decision === true ||
        (decision &&
          typeof decision === 'object' &&
          decision.allowed === true))
    ) {
      return;
    }
    if (
      mode !== 'localFixtureMode' &&
      isVerifiedAuthorizationDecision(decision)
    ) {
      return;
    }
    throw protocolError(
      'AUTHORIZATION_DENIED',
      'The capability is not authorized in this scope.',
    );
  }

  function submitApprovalDecisionForChallenge(
    challenge,
    decision,
    requestContext,
    persistent,
  ) {
    if (!challenge) {
      throw protocolError('APPROVAL_INVALID', 'The Approval Challenge was not found.');
    }
    validateApprovalDecision(decision, challenge, { clock });
    const updatedChallenge = {
      ...challenge,
      status: decision.decision === 'approved' ? 'approved' : 'rejected',
    };
    const storedDecision = {
      ...structuredClone(decision),
      invocationId: challenge.invocationId,
      organizationScope: challenge.organizationScope,
      workspaceScope: challenge.workspaceScope,
      actionKey: challenge.actionKey,
      approvalLimits: structuredClone(challenge.approvalLimits),
      policyDecisionReference: challenge.policyDecisionReference,
      expiresAt: challenge.expiresAt,
      used: false,
    };
    const complete = () => {
      metric('approval', decision.decision);
      audit('protocol.approval.decided', {
        organizationScope: challenge.organizationScope,
        workspaceScope: challenge.workspaceScope,
        decision: decision.decision,
        principalId: requestContext.authenticatedPrincipal?.subjectId,
      });
      return structuredClone(decision);
    };
    if (persistent) {
      return Promise.resolve(decisions.putDecision(storedDecision))
        .then(() => storePut(challenges, challenge.challengeId, updatedChallenge))
        .then(complete);
    }
    decisions.set(decision.decisionId, storedDecision);
    challenges.set(challenge.challengeId, updatedChallenge);
    return complete();
  }

  async function persistTerminalExecution({
    task,
    receipt,
    expectedTaskStates,
  }) {
    if (
      !task?.receiptReference ||
      task.receiptReference !== receipt?.receiptId ||
      receipt.taskId !== task.taskId
    ) {
      throw protocolError(
        'PROOF_INVALID',
        'Terminal Task and Receipt persistence bindings are invalid.',
      );
    }
    if (productionMode) {
      let result;
      try {
        result = await terminalTransactions.commitTerminal({
          task: structuredClone(task),
          receipt: structuredClone(receipt),
          expectedTaskStates: [...expectedTaskStates],
        });
      } catch {
        throw protocolError(
          'TERMINAL_PERSISTENCE_REQUIRED',
          'Terminal Task and Receipt persistence was unavailable.',
          { retryable: true },
        );
      }
      if (result?.committed !== true) {
        throw protocolError(
          'TERMINAL_PERSISTENCE_REQUIRED',
          'Terminal Task and Receipt persistence requires recovery.',
          {
            retryable: true,
            details: {
              recoveryRequired: result?.recoveryRequired === true,
              reasonCode: String(result?.reasonCode || 'TERMINAL_WRITE_REJECTED').slice(0, 100),
            },
          },
        );
      }
      const [storedTask, storedReceipt] = await Promise.all([
        storeGet(taskStore, task.taskId),
        storeGet(receipts, receipt.receiptId),
      ]);
      if (
        storedTask?.receiptReference !== receipt.receiptId ||
        storedTask?.state !== task.state ||
        storedReceipt?.taskId !== task.taskId
      ) {
        throw protocolError(
          'TERMINAL_PERSISTENCE_REQUIRED',
          'Terminal Task and Receipt persistence could not be verified.',
          { retryable: true },
        );
      }
      return;
    }
    await storePut(receipts, receipt.receiptId, receipt);
    try {
      await storePut(taskStore, task.taskId, task);
    } catch {
      await storeDelete(receipts, receipt.receiptId);
      throw protocolError(
        'TERMINAL_PERSISTENCE_REQUIRED',
        'Terminal Task persistence failed and the Receipt was rolled back.',
        { retryable: true },
      );
    }
  }

  async function consumeApprovalDecision(criteria) {
    if (!criteria.decisionId) return undefined;
    if (productionMode) {
      const consumed = await decisions.consumeApprovedDecision(criteria);
      return isMatchingApprovalDecision(consumed, criteria) ? consumed : undefined;
    }
    const decision = decisions.get(criteria.decisionId);
    if (!isMatchingApprovalDecision(decision, criteria) || decision.used) return undefined;
    decision.used = true;
    decision.consumedAt = criteria.now;
    return structuredClone(decision);
  }

  async function issueExecutionReceipt({
    connection,
    envelope,
    contract,
    task,
    outcome,
    output,
    safeFailureCode,
  }) {
    const evidence = terminalReceiptEvidence({
      connection,
      envelope,
      task,
      outcome,
      safeFailureCode,
    });
    const receipt = await receiptIssuer({
      passport,
      contract,
      connection,
      envelope,
      task,
      result: { outcome, output, safeFailureCode },
      evidence,
      clock,
    });
    validateReceipt(receipt);
    assertReceiptBindings(receipt, {
      passport,
      contract,
      connection,
      envelope,
      task,
      outcome,
      safeFailureCode,
    });
    if (productionMode) {
      if (!receipt.proof) {
        throw protocolError(
          'PROOF_REQUIRED',
          'A cryptographically signed Execution Receipt is required.',
        );
      }
      try {
        verifyTrustedReceipt(
          receipt,
          passport,
          options.receiptVerificationJwks,
          {
            expectedAudience:
              connection.hostAudience || options.receiptAudience || options.hostAudience,
            actualOutput: output ?? null,
            actualEvidence: evidence,
            invocation: {
              ...envelope,
              connectionId: connection.connectionId,
            },
            clock,
            productionMode: true,
          },
        );
      } catch (error) {
        if (typeof options.receiptVerificationObserver === 'function') {
          options.receiptVerificationObserver({
            valid: false,
            errorCode: String(error?.code || 'PROOF_INVALID').slice(0, 128),
            safeMessage: String(error?.safeMessage || error?.message || '').slice(0, 256),
          });
        }
        throw protocolError(
          'PROOF_INVALID',
          'The Execution Receipt proof or binding is invalid.',
        );
      }
    }
    return receipt;
  }

  function redeemInstallGrantRecord(grant, scope, requestContext) {
    assertGrantScope(grant, scope, clock, { allowRedeemed: true });
    if (grant.status === 'redeemed') {
      const replay = (connection) => {
        if (!connection) {
          throw protocolError(
            'CONNECTION_NOT_ACTIVE',
            'The redeemed Install Grant Connection was not found.',
          );
        }
        return { ...publicConnection(connection), idempotentReplay: true };
      };
      return replay(connections.get(grant.connectionId));
    }
    const selectedAuthenticationMode =
      scope.authenticationMode || authenticationModes[0];
    if (!authenticationModes.includes(selectedAuthenticationMode)) {
      throw protocolError(
        'NO_COMPATIBLE_AUTHENTICATION_MODE',
        'The selected authentication mode is not supported.',
      );
    }
    const enabledCapabilityKeys =
      scope.approvedCapabilityKeys ||
      (mode === 'localFixtureMode' &&
      options.approveAllFixtureCapabilities === true
        ? grant.allowedCapabilityKeys
        : undefined);
    if (
      !Array.isArray(enabledCapabilityKeys) ||
      enabledCapabilityKeys.length === 0 ||
      enabledCapabilityKeys.some(
        (key) => !grant.allowedCapabilityKeys.includes(key),
      )
    ) {
      throw protocolError(
        'AUTHORIZATION_DENIED',
        'The requested capability enablement is not authorized by the Install Grant.',
      );
    }
    if (
      selectedAuthenticationMode !== 'none' &&
      (!scope.authenticationBinding ||
        (!scope.authenticationBinding.credentialReference &&
          !scope.authenticationBinding.transportBindingReference) ||
        scope.authenticationBinding.authenticationMode !==
          selectedAuthenticationMode ||
        scope.authenticationBinding.organizationScope !==
          grant.organizationScope ||
        (scope.authenticationBinding.workspaceScope || undefined) !==
          (grant.workspaceScope || undefined))
    ) {
      throw protocolError(
        'AUTHENTICATION_REQUIRED',
        'The selected authentication mode requires a scope-bound opaque binding.',
      );
    }
    const connectionId = `connection_${crypto.randomUUID()}`;
    const now = new Date(clock()).toISOString();
    const connection = {
      connectionId,
      agentId: passport.agentId,
      passportVersion: passport.passportVersion,
      organizationScope: grant.organizationScope,
      workspaceScope: grant.workspaceScope,
      status: 'active',
      authenticationMode: selectedAuthenticationMode,
      authenticationState:
        selectedAuthenticationMode === 'none'
          ? 'not_required'
          : 'verified_and_bound',
      ...(scope.authenticationBinding
        ? {
            authenticationBindingReference:
              scope.authenticationBinding.credentialReference ||
              scope.authenticationBinding.transportBindingReference,
          }
        : {}),
      hostAudience: scope.hostAudience || options.hostAudience,
      enabledCapabilityKeys: [...enabledCapabilityKeys],
      disabledCapabilityKeys: grant.allowedCapabilityKeys.filter(
        (key) => !enabledCapabilityKeys.includes(key),
      ),
      createdAt: now,
      revocationReference: `revocations/connection/${connectionId}`,
    };
    const updatedGrant = {
      ...grant,
      status: 'redeemed',
      redeemedAt: now,
      connectionId,
    };
    const complete = () => {
      metric('connection', 'created');
      audit('protocol.install_grant.redeemed', {
        organizationScope: grant.organizationScope,
        workspaceScope: grant.workspaceScope,
        outcome: 'redeemed',
      });
      audit('protocol.connection.created', {
        organizationScope: grant.organizationScope,
        workspaceScope: grant.workspaceScope,
        outcome: 'created',
        principalId: requestContext.authenticatedPrincipal?.subjectId,
      });
      return { ...publicConnection(connection), idempotentReplay: false };
    };
    connections.set(connectionId, connection);
    installGrants.set(grant.keyHash, updatedGrant);
    return complete();
  }

  async function redeemInstallGrantAtomically(
    key,
    scope,
    requestContext,
  ) {
    if (!scope.organizationScope) {
      throw protocolError(
        'SCOPE_REQUIRED',
        'Organization scope is required.',
      );
    }
    const selectedAuthenticationMode =
      scope.authenticationMode || authenticationModes[0];
    if (!authenticationModes.includes(selectedAuthenticationMode)) {
      throw protocolError(
        'NO_COMPATIBLE_AUTHENTICATION_MODE',
        'The selected authentication mode is not supported.',
      );
    }
    const enabledCapabilityKeys = scope.approvedCapabilityKeys;
    if (
      !Array.isArray(enabledCapabilityKeys) ||
      enabledCapabilityKeys.length === 0
    ) {
      throw protocolError(
        'AUTHORIZATION_DENIED',
        'The requested capability enablement is not authorized by the Install Grant.',
      );
    }
    if (
      selectedAuthenticationMode !== 'none' &&
      (!scope.authenticationBinding ||
        (!scope.authenticationBinding.credentialReference &&
          !scope.authenticationBinding.transportBindingReference) ||
        scope.authenticationBinding.authenticationMode !==
          selectedAuthenticationMode ||
        scope.authenticationBinding.organizationScope !==
          scope.organizationScope ||
        (scope.authenticationBinding.workspaceScope || undefined) !==
          (scope.workspaceScope || undefined))
    ) {
      throw protocolError(
        'AUTHENTICATION_REQUIRED',
        'The selected authentication mode requires a scope-bound opaque binding.',
      );
    }

    const keyHash = digest({ key });
    let trustedGrant;
    try {
      trustedGrant = await storeGet(installGrants, keyHash);
    } catch {
      throw protocolError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant trusted context was unavailable.',
      );
    }
    if (
      !trustedGrant ||
      trustedGrant.keyHash !== keyHash ||
      trustedGrant.issuer !== passport.issuer ||
      trustedGrant.agentId !== passport.agentId ||
      !Array.isArray(trustedGrant.allowedCapabilityKeys)
    ) {
      throw protocolError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant trusted context is invalid.',
      );
    }
    assertGrantScope(trustedGrant, scope, clock);
    const uniqueEnabledCapabilityKeys = [...new Set(enabledCapabilityKeys)];
    if (
      uniqueEnabledCapabilityKeys.some(
        (capabilityKey) =>
          !trustedGrant.allowedCapabilityKeys.includes(capabilityKey),
      )
    ) {
      throw protocolError(
        'AUTHORIZATION_DENIED',
        'The requested capability enablement is not authorized by the Install Grant.',
      );
    }
    const connectionId = `connection_${crypto.randomUUID()}`;
    const now = new Date(clock()).toISOString();
    const connectionCandidate = {
      connectionId,
      agentId: passport.agentId,
      passportVersion: passport.passportVersion,
      organizationScope: trustedGrant.organizationScope,
      ...(trustedGrant.workspaceScope
        ? { workspaceScope: trustedGrant.workspaceScope }
        : {}),
      status: 'active',
      authenticationMode: selectedAuthenticationMode,
      authenticationState:
        selectedAuthenticationMode === 'none'
          ? 'not_required'
          : 'verified_and_bound',
      ...(scope.authenticationBinding
        ? {
            authenticationBindingReference:
              scope.authenticationBinding.credentialReference ||
              scope.authenticationBinding.transportBindingReference,
          }
        : {}),
      ...(scope.hostAudience || options.hostAudience
        ? { hostAudience: scope.hostAudience || options.hostAudience }
        : {}),
      enabledCapabilityKeys: uniqueEnabledCapabilityKeys,
      disabledCapabilityKeys: trustedGrant.allowedCapabilityKeys.filter(
        (capabilityKey) =>
          !uniqueEnabledCapabilityKeys.includes(capabilityKey),
      ),
      createdAt: now,
      revocationReference: `revocations/connection/${connectionId}`,
    };

    let result;
    try {
      result = await installGrantTransactions.redeemInstallGrant({
        keyHash,
        now,
        organizationScope: scope.organizationScope,
        ...(scope.workspaceScope
          ? { workspaceScope: scope.workspaceScope }
          : {}),
        approvedCapabilityKeys: uniqueEnabledCapabilityKeys,
        connection: connectionCandidate,
      });
    } catch (error) {
      const errorCode = error?.errorCode || error?.code;
      if (
        [
          'INSTALL_GRANT_INVALID',
          'INSTALL_GRANT_EXPIRED',
          'INSTALL_GRANT_ALREADY_REDEEMED',
          'SCOPE_MISMATCH',
          'AUTHORIZATION_DENIED',
          'REVOKED',
        ].includes(errorCode)
      ) {
        throw protocolError(
          errorCode,
          installGrantRedemptionSafeMessage(errorCode),
        );
      }
      throw protocolError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant redemption transaction failed closed.',
      );
    }

    const transactionGrant = result?.grant;
    const connection = result?.connection;
    const expectedTransactionGrant = {
      ...trustedGrant,
      status: 'redeemed',
      redeemedAt: now,
      connectionId,
    };
    if (
      !transactionGrant ||
      !connection ||
      !isDeepStrictEqual(transactionGrant, expectedTransactionGrant) ||
      !isDeepStrictEqual(connection, connectionCandidate)
    ) {
      throw protocolError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant redemption transaction returned invalid state.',
      );
    }

    const [storedGrant, storedConnection] = await Promise.all([
      storeGet(installGrants, keyHash),
      storeGet(connections, connectionId),
    ]);
    if (
      boundedSerialize(storedGrant) !== boundedSerialize(transactionGrant) ||
      boundedSerialize(storedConnection) !== boundedSerialize(connection)
    ) {
      throw protocolError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant redemption transaction was not durably observable.',
      );
    }

    metric('connection', 'created');
    audit('protocol.install_grant.redeemed', {
      organizationScope: transactionGrant.organizationScope,
      workspaceScope: transactionGrant.workspaceScope,
      outcome: 'redeemed',
    });
    audit('protocol.connection.created', {
      organizationScope: connection.organizationScope,
      workspaceScope: connection.workspaceScope,
      outcome: 'created',
      principalId: requestContext.authenticatedPrincipal?.subjectId,
    });
    return { ...publicConnection(connection), idempotentReplay: false };
  }

  function installResolution(grant, scope) {
    assertGrantScope(grant, scope, clock);
    metric('install_grant', 'resolved');
    audit('protocol.install_grant.resolved', {
      organizationScope: grant.organizationScope,
      workspaceScope: grant.workspaceScope,
      outcome: 'resolved',
    });
    return {
      protocolVersion: PROTOCOL_VERSION,
      grantReference: grant.grantId,
      passport: agent.getPassport(),
      capabilities: agent
        .listCapabilities()
        .filter((capability) =>
          grant.allowedCapabilityKeys.includes(capability.capabilityKey),
        ),
      connectionOffer: connectionOffer(
        grant,
        passport,
        authenticationModes,
        options.authenticationSetupReference,
        options.hostAudience,
      ),
      issuerVerification: {
        cryptographicStatus: 'not_evaluated',
        hostTrustStatus: 'not_evaluated',
        issuer: passport.issuer,
        trustProfile: passport.trustProfileVersion || 'not_declared',
      },
      requestedScope: {
        organizationScope: grant.organizationScope,
        ...(grant.workspaceScope ? { workspaceScope: grant.workspaceScope } : {}),
      },
      restrictions: [...grant.restrictions],
      expiresAt: grant.expiresAt,
      redemptionState: grant.status === 'active' ? 'available' : grant.status,
    };
  }

  function findGrant(key) {
    const requireGrant = (grant) => {
      if (!grant) {
        throw protocolError(
          'INSTALL_GRANT_INVALID',
          'The Install Grant is invalid.',
        );
      }
      return grant;
    };
    if (productionMode) {
      return storeGet(installGrants, digest({ key })).then(requireGrant);
    }
    return requireGrant(installGrants.get(digest({ key })));
  }

  return agent;
}

function assertGrantScope(grant, scope, clock, options = {}) {
  if (Date.parse(grant.expiresAt) <= clock()) {
    grant.status = 'expired';
    throw protocolError('INSTALL_GRANT_EXPIRED', 'The Install Grant has expired.');
  }
  if (grant.status === 'revoked') {
    throw protocolError('REVOKED', 'The Install Grant has been revoked.');
  }
  if (grant.status === 'redeemed' && !options.allowRedeemed) {
    throw protocolError('INSTALL_GRANT_ALREADY_REDEEMED', 'The Install Grant was already redeemed.');
  }
  if (!scope.organizationScope) throw protocolError('SCOPE_REQUIRED', 'Organization scope is required.');
  if (grant.organizationScope !== scope.organizationScope) {
    throw protocolError('SCOPE_MISMATCH', 'The Install Grant organization scope does not match.');
  }
  if (grant.workspaceScope && grant.workspaceScope !== scope.workspaceScope) {
    throw protocolError('SCOPE_MISMATCH', 'The Install Grant workspace scope does not match.');
  }
}

function normalizeCapabilityDefinition(capabilityKey, definition = {}) {
  if (definition.contract) {
    return {
      contract: {
        ...definition.contract,
        capabilityKey,
        ...(definition.inputContract ? { inputSchema: definition.inputContract } : {}),
        ...(definition.outputContract ? { outputSchema: definition.outputContract } : {}),
      },
      inputSchema: definition.inputContract,
      outputSchema: definition.outputContract,
    };
  }
  const inputReference =
    definition.inputContractReference ||
    `data-contracts/${capabilityKey}/input/${digest(definition.inputContract || {})}`;
  const outputReference =
    definition.outputContractReference ||
    `data-contracts/${capabilityKey}/output/${digest(definition.outputContract || {})}`;
  return {
    inputSchema: definition.inputContract,
    outputSchema: definition.outputContract,
    contract: {
      capabilityKey,
      capabilityVersion: definition.capabilityVersion || '1.0.0',
      displayName: definition.displayName || capabilityKey,
      safeDescription: definition.safeDescription || `Ghost Bridge capability ${capabilityKey}`,
      inputContractReference: inputReference,
      outputContractReference: outputReference,
      ...(definition.inputContract ? { inputSchema: definition.inputContract } : {}),
      ...(definition.outputContract ? { outputSchema: definition.outputContract } : {}),
      acceptedDataClasses: definition.acceptedDataClasses || [],
      producedDataClasses: definition.producedDataClasses || [],
      prohibitedDataClasses: definition.prohibitedDataClasses || [],
      riskCategory: definition.riskCategory || 'unknown',
      sideEffectCategory: definition.sideEffectCategory || 'unknown',
      idempotencySupport: definition.idempotencyRequirement || 'optional',
      asynchronousSupport: definition.asynchronousExecution === true,
      cancellationSupport: definition.cancellation !== false,
      requiredPermissions: definition.requiredPermissions || [],
      approvalRequirement: definition.approvalRequirement || 'none',
      delegationPolicy: definition.delegationPolicy || { allowed: false },
      timeoutBounds: definition.timeoutBounds || { minimumMs: 1, maximumMs: 30_000 },
      receiptRequirement: definition.receiptProfile || 'standard',
      status: definition.status || 'active',
    },
  };
}

function capabilityScope(options) {
  return {
    organizationScope: options.organizationScope,
    workspaceScope: options.workspaceScope,
    connectionId: options.connectionId,
    initiatingSubject: options.initiatingSubject,
  };
}

function tokenize(value) {
  return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) || [])].slice(
    0,
    20,
  );
}

function capabilityScore(contract, tokens) {
  if (!tokens.length) return 1;
  const key = contract.capabilityKey.toLowerCase();
  const name = contract.displayName.toLowerCase();
  const description = contract.safeDescription.toLowerCase();
  const classifications = [
    ...(contract.acceptedDataClasses || []),
    ...(contract.producedDataClasses || []),
  ]
    .join(' ')
    .toLowerCase();
  return tokens.reduce(
    (score, token) =>
      score +
      (key === token ? 20 : key.startsWith(token) ? 12 : key.includes(token) ? 8 : 0) +
      (name.includes(token) ? 6 : 0) +
      (description.includes(token) ? 3 : 0) +
      (classifications.includes(token) ? 2 : 0),
    0,
  );
}

function encodeCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (Number.isInteger(value) && value >= 0 && value <= 10_000) return value;
  } catch {
    // Fall through.
  }
  throw protocolError('INVALID_MESSAGE', 'The capability cursor is invalid.');
}

function createSafeLogger(candidate) {
  const sink = candidate && typeof candidate === 'object' ? candidate : {};
  const safe = {};
  for (const level of ['debug', 'info', 'warn', 'error']) {
    safe[level] = (message, fields = {}) => {
      if (typeof sink[level] !== 'function') return;
      const bounded = Object.fromEntries(
        Object.entries(fields)
          .filter(([key]) => !/(?:credential|secret|token|authorization|cookie|payload|input|output)/i.test(key))
          .slice(0, 20),
      );
      sink[level](String(message).slice(0, 500), bounded);
    };
  }
  return Object.freeze(safe);
}

function connectionOffer(
  grant,
  passport,
  authenticationModes = ['none'],
  authenticationSetupReference = 'ghostbridge:draft-local-fixture',
  hostAudience,
) {
  return {
    connectionOfferId: `offer_${grant.grantId}`,
    agentId: passport.agentId,
    passportReference: `passports/${passport.passportId}/versions/${passport.passportVersion}`,
    protocolVersion: PROTOCOL_VERSION,
    transportCategory: 'http-json',
    runtimeReference: 'discovery:endpoints.invocations',
    authenticationMode: authenticationModes[0],
    authenticationModes: [...authenticationModes],
    authenticationSetupReference,
    ...(hostAudience ? { audience: hostAudience } : {}),
    expiresAt: grant.expiresAt,
    acceptedOrganizationScope: grant.organizationScope,
    ...(grant.workspaceScope ? { acceptedWorkspaceScope: grant.workspaceScope } : {}),
    restrictions: [...grant.restrictions],
    revocationReference: `revocations/install_grant/${grant.grantId}`,
  };
}

function publicConnection(connection) {
  return structuredClone({
    protocolVersion: PROTOCOL_VERSION,
    connectionId: connection.connectionId,
    agentId: connection.agentId,
    passportVersion: connection.passportVersion,
    organizationScope: connection.organizationScope,
    ...(connection.workspaceScope ? { workspaceScope: connection.workspaceScope } : {}),
    status: connection.status,
    authenticationMode: connection.authenticationMode,
    authenticationState: connection.authenticationState,
    ...(connection.hostAudience ? { hostAudience: connection.hostAudience } : {}),
    enabledCapabilityKeys: connection.enabledCapabilityKeys,
    disabledCapabilityKeys: connection.disabledCapabilityKeys,
    createdAt: connection.createdAt,
    revocationReference: connection.revocationReference,
  });
}

function requireTask(task) {
  if (!task) {
    throw protocolError('TASK_NOT_FOUND', 'The Execution Task was not found.');
  }
  return structuredClone(task);
}

function requireReceipt(receipt) {
  if (!receipt) {
    throw protocolError('INVALID_MESSAGE', 'The Execution Receipt was not found.');
  }
  return structuredClone(receipt);
}

function connectionRevocation(connection, subjectReference, passport, clock) {
  if (!connection) {
    throw protocolError(
      'CONNECTION_NOT_ACTIVE',
      'The Agent Connection was not found.',
    );
  }
  const status = connection.status === 'revoked' ? 'revoked' : 'active';
  return {
    revocationId: `revocation_${subjectReference}`,
    subjectType: 'connection',
    subjectReference,
    status,
    reasonCode: status === 'revoked' ? 'OWNER_REVOKED' : 'NOT_REVOKED',
    effectiveAt:
      connection.revokedAt ||
      connection.createdAt ||
      new Date(clock()).toISOString(),
    issuedBy: passport.issuer,
  };
}

function createTask(envelope, contract, clock, state = 'accepted') {
  const now = new Date(clock()).toISOString();
  const task = {
    taskId: `task_${crypto.randomUUID()}`,
    invocationId: envelope.invocationId,
    state,
    safeProgressCategory: state,
    createdAt: now,
    updatedAt: now,
    deadline: envelope.deadline,
    cancellationSupported: contract.cancellationSupport,
    retryCategory: 'none',
    nextActionCategory: state === 'waiting_for_approval' ? 'submit_approval' : 'poll',
  };
  validateTask(task);
  return task;
}

function approvalActionDigestForInvocation({
  connection,
  envelope,
  registered,
  approvalLimits,
  policyDecisionReference,
  validityBoundary,
}) {
  return approvalActionDigest({
    invocationId: envelope.invocationId,
    connectionId: connection.connectionId,
    capabilityKey: envelope.capabilityKey,
    capabilityVersion: envelope.capabilityVersion,
    organizationScope: envelope.organizationScope,
    workspaceScope: envelope.workspaceScope,
    inputContractReference: envelope.inputContractReference,
    payload: envelope.payload,
    sideEffectCategory: registered.contract.sideEffectCategory,
    approvalLimits,
    policyDecisionReference,
    validityBoundary,
  });
}

function createTaskReceiptContext({
  connection,
  envelope,
  contract,
  task,
  passport,
}) {
  const requestFingerprint = envelope.idempotencyKey
    ? digest({
        connectionId: connection.connectionId,
        capabilityKey: envelope.capabilityKey,
        capabilityVersion: envelope.capabilityVersion,
        idempotencyKey: envelope.idempotencyKey,
        payload: envelope.payload,
      })
    : undefined;
  const context = removeUndefinedFields({
    connectionId: connection.connectionId,
    organizationScope: connection.organizationScope,
    workspaceScope: connection.workspaceScope,
    capabilityKey: contract.capabilityKey,
    invocation: {
      invocationId: envelope.invocationId,
      connectionId: connection.connectionId,
      targetAgentId: envelope.targetAgentId,
      targetPassportVersion: envelope.targetPassportVersion,
      capabilityKey: envelope.capabilityKey,
      capabilityVersion: envelope.capabilityVersion,
      organizationScope: envelope.organizationScope,
      workspaceScope: envelope.workspaceScope,
      inputContractReference: contract.inputContractReference,
      deadline: envelope.deadline,
      approvalReference: envelope.approvalReference,
      requestFingerprint,
    },
    envelope: {
      protocolVersion: envelope.protocolVersion,
      invocationId: envelope.invocationId,
      targetAgentId: envelope.targetAgentId,
      targetPassportVersion: envelope.targetPassportVersion,
      capabilityKey: envelope.capabilityKey,
      capabilityVersion: envelope.capabilityVersion,
      organizationScope: envelope.organizationScope,
      workspaceScope: envelope.workspaceScope,
      deadline: envelope.deadline,
      approvalReference: envelope.approvalReference,
      requestFingerprint,
    },
    connection: {
      connectionId: connection.connectionId,
      agentId: connection.agentId,
      passportVersion: connection.passportVersion,
      organizationScope: connection.organizationScope,
      workspaceScope: connection.workspaceScope,
      hostAudience: connection.hostAudience,
      status: connection.status,
    },
    contract: {
      capabilityKey: contract.capabilityKey,
      capabilityVersion: contract.capabilityVersion,
      inputContractReference: contract.inputContractReference,
      outputContractReference: contract.outputContractReference,
      receiptRequirement: contract.receiptRequirement,
    },
    passportReference: {
      passportId: passport.passportId,
      passportVersion: passport.passportVersion,
      agentId: passport.agentId,
      issuer: passport.issuer,
    },
    approvalReference: envelope.approvalReference,
    requestFingerprint,
    startTime: task.createdAt,
    receiptProfile: contract.receiptRequirement || 'standard',
    safeTerminalEvidence: {
      attemptCount: 1,
    },
  });
  assertPlainData(context, {
    ...DEFAULT_LIMITS,
    maximumMessageBytes: Math.min(DEFAULT_LIMITS.maximumMessageBytes, 32_768),
  });
  return context;
}

function removeUndefinedFields(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(removeUndefinedFields);
  }
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, removeUndefinedFields(child)]),
  );
}

async function defaultReceiptIssuer({
  passport,
  contract,
  connection,
  envelope,
  task,
  result,
  evidence,
  clock,
}) {
  const receipt = {
    receiptId: `receipt_${crypto.randomUUID()}`,
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    connectionId: connection.connectionId,
    agentId: passport.agentId,
    passportId: passport.passportId,
    passportVersion: passport.passportVersion,
    capabilityKey: contract.capabilityKey,
    capabilityVersion: contract.capabilityVersion,
    organizationScope: connection.organizationScope,
    ...(connection.workspaceScope ? { workspaceScope: connection.workspaceScope } : {}),
    outcome: result.outcome || 'completed',
    outputContractReference: contract.outputContractReference,
    startedAt: task.startedAt || task.createdAt,
    completedAt: task.completedAt || new Date(clock()).toISOString(),
    attemptCount: 1,
    ...(envelope.approvalReference ? { approvalReference: envelope.approvalReference } : {}),
    ...(envelope.delegationReference ? { delegationReference: envelope.delegationReference } : {}),
    ...((envelope.requestFingerprint || envelope.idempotencyKey)
      ? {
          requestFingerprint:
            envelope.requestFingerprint ||
            digest({
              connectionId: connection.connectionId,
              capabilityKey: envelope.capabilityKey,
              capabilityVersion: envelope.capabilityVersion,
              idempotencyKey: envelope.idempotencyKey,
              payload: envelope.payload,
            }),
        }
      : {}),
    ...(result.safeFailureCode ? { safeFailureCode: result.safeFailureCode } : {}),
    outputDigest: trustDigest(result.output ?? null),
    evidenceDigest: trustDigest(evidence),
    billableStatusCategory: 'non_billable',
    nonBillableReason: 'deterministic_local_fixture',
    revocationStateAtExecution: 'active',
  };
  return receipt;
}

function terminalReceiptEvidence({
  connection,
  envelope,
  task,
  outcome,
  safeFailureCode,
}) {
  return {
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    connectionId: connection.connectionId,
    capabilityKey: envelope.capabilityKey,
    capabilityVersion: envelope.capabilityVersion,
    organizationScope: envelope.organizationScope,
    ...(envelope.workspaceScope ? { workspaceScope: envelope.workspaceScope } : {}),
    outcome,
    ...(safeFailureCode ? { safeFailureCode } : {}),
  };
}

function assertReceiptBindings(receipt, context) {
  const expected = {
    invocationId: context.envelope.invocationId,
    taskId: context.task.taskId,
    connectionId: context.connection.connectionId,
    agentId: context.passport.agentId,
    passportId: context.passport.passportId,
    passportVersion: context.passport.passportVersion,
    capabilityKey: context.contract.capabilityKey,
    capabilityVersion: context.contract.capabilityVersion,
    organizationScope: context.connection.organizationScope,
    workspaceScope: context.connection.workspaceScope,
    outcome: context.outcome,
    approvalReference: context.envelope.approvalReference,
    safeFailureCode: context.safeFailureCode,
  };
  for (const [field, value] of Object.entries(expected)) {
    if ((receipt[field] || undefined) !== (value || undefined)) {
      throw protocolError(
        'PROOF_INVALID',
        'The Execution Receipt is not bound to the terminal execution context.',
      );
    }
  }
  if (
    !receipt.startedAt ||
    !receipt.completedAt ||
    receipt.attemptCount < 1 ||
    receipt.revocationStateAtExecution !== 'active'
  ) {
    throw protocolError('PROOF_INVALID', 'The Execution Receipt is incomplete.');
  }
}

function assertDurableStore(store, name, extraMethods = []) {
  const requiredMethods = [
    'get',
    'put',
    'delete',
    'has',
    'compareAndSet',
    ...extraMethods,
  ];
  const capabilities = store?.capabilities;
  if (
    !store ||
    store instanceof Map ||
    !capabilities ||
    capabilities.persistence !== 'durable' ||
    capabilities.productionEligible !== true ||
    capabilities.atomicCompareAndSet !== true ||
    capabilities.transactionalTerminalWrite !== false ||
    capabilities.atomicInstallGrantRedemption !== false ||
    typeof capabilities.adapterName !== 'string' ||
    !capabilities.adapterName.trim() ||
    typeof capabilities.adapterVersion !== 'string' ||
    !capabilities.adapterVersion.trim() ||
    isObviousInMemoryStore(store) ||
    requiredMethods.some((method) => typeof store[method] !== 'function')
  ) {
    throw new TypeError(
      `Production ${name} store must be a production-eligible asynchronous durable adapter and implement ${requiredMethods.join(', ')}.`,
    );
  }
}

function assertTerminalTransactionStore(store) {
  const capabilities = store?.capabilities;
  if (
    !store ||
    !capabilities ||
    capabilities.persistence !== 'durable' ||
    capabilities.productionEligible !== true ||
    capabilities.atomicCompareAndSet !== true ||
    capabilities.transactionalTerminalWrite !== true ||
    capabilities.atomicInstallGrantRedemption !== false ||
    typeof capabilities.adapterName !== 'string' ||
    !capabilities.adapterName.trim() ||
    typeof capabilities.adapterVersion !== 'string' ||
    !capabilities.adapterVersion.trim() ||
    isObviousInMemoryStore(store) ||
    typeof store.commitTerminal !== 'function' ||
    typeof store.recoverTerminalWrites !== 'function'
  ) {
    throw new TypeError(
      'Production terminalTransactions store must provide durable transactional terminal writes.',
    );
  }
}

function assertInstallGrantTransactionStore(store) {
  const capabilities = store?.capabilities;
  if (
    !store ||
    !capabilities ||
    capabilities.persistence !== 'durable' ||
    capabilities.productionEligible !== true ||
    capabilities.atomicCompareAndSet !== true ||
    capabilities.transactionalTerminalWrite !== false ||
    capabilities.atomicInstallGrantRedemption !== true ||
    typeof capabilities.adapterName !== 'string' ||
    !capabilities.adapterName.trim() ||
    typeof capabilities.adapterVersion !== 'string' ||
    !capabilities.adapterVersion.trim() ||
    isObviousInMemoryStore(store) ||
    typeof store.redeemInstallGrant !== 'function'
  ) {
    throw new TypeError(
      'Production installGrantTransactions store must provide atomic durable Install Grant redemption.',
    );
  }
}

function isObviousInMemoryStore(store) {
  if (store instanceof Map) return true;
  const adapterName = String(store?.capabilities?.adapterName || '').toLowerCase();
  if (/(?:memory|map|fixture|mock|fake|test)/.test(adapterName)) return true;
  return Object.values(store || {}).some((value) => value instanceof Map);
}

function installGrantRedemptionSafeMessage(errorCode) {
  const messages = {
    INSTALL_GRANT_INVALID: 'The Install Grant is invalid.',
    INSTALL_GRANT_EXPIRED: 'The Install Grant has expired.',
    INSTALL_GRANT_ALREADY_REDEEMED:
      'The Install Grant was already redeemed.',
    SCOPE_MISMATCH: 'The Install Grant scope does not match.',
    AUTHORIZATION_DENIED:
      'The requested capability enablement is not authorized by the Install Grant.',
    REVOKED: 'The Install Grant has been revoked.',
  };
  return messages[errorCode] || 'The Install Grant redemption failed.';
}

function storeGet(store, key) {
  return Promise.resolve(store.get(key));
}

function storePut(store, key, value) {
  if (typeof store.put === 'function') return Promise.resolve(store.put(key, value));
  return Promise.resolve(store.set(key, value));
}

function storeDelete(store, key) {
  if (typeof store.delete !== 'function') return Promise.resolve(false);
  return Promise.resolve(store.delete(key));
}

function storeHas(store, key) {
  return Promise.resolve(store.has(key));
}

async function storeValues(store) {
  const values = await Promise.resolve(store.values());
  return Array.isArray(values) ? values : [...values];
}

function normalizeHttpPrincipal(value, options = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Authenticated Host principal is invalid.');
  }
  assertPlainData(value);
  const subjectId = String(value.subjectId || value.principalId || '').trim();
  const authenticationMethod = String(value.authenticationMethod || '').trim();
  const organizationScope = String(value.organizationScope || '').trim();
  const permittedOrganizationScopes = [
    ...new Set(
      (value.permittedOrganizationScopes || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  ];
  const workspaceScope = String(value.workspaceScope || '').trim();
  const permittedWorkspaceScopes = [
    ...new Set(
      (value.permittedWorkspaceScopes || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  ];
  if (
    !subjectId ||
    !authenticationMethod ||
    (!organizationScope && permittedOrganizationScopes.length === 0) ||
    (options.allowWildcard !== true &&
      (permittedOrganizationScopes.includes('*') ||
        permittedWorkspaceScopes.includes('*')))
  ) {
    throw new TypeError('Authenticated Host principal is incomplete.');
  }
  return Object.freeze({
    subjectType: String(value.subjectType || 'host').slice(0, 64),
    subjectId: subjectId.slice(0, 256),
    authenticationMethod: authenticationMethod.slice(0, 128),
    ...(organizationScope ? { organizationScope } : {}),
    permittedOrganizationScopes: Object.freeze(permittedOrganizationScopes),
    ...(workspaceScope ? { workspaceScope } : {}),
    permittedWorkspaceScopes: Object.freeze(permittedWorkspaceScopes),
    ...(value.credentialReference
      ? { credentialReference: String(value.credentialReference).slice(0, 256) }
      : {}),
  });
}

function assertPrincipalScope(principal, scope = {}) {
  const organizationScope = String(scope.organizationScope || '').trim();
  const workspaceScope = String(scope.workspaceScope || '').trim();
  if (
    organizationScope &&
    principal.organizationScope !== organizationScope &&
    !principal.permittedOrganizationScopes.includes('*') &&
    !principal.permittedOrganizationScopes.includes(organizationScope)
  ) {
    throw protocolError(
      'SCOPE_MISMATCH',
      'The authenticated Host principal is outside the requested organization scope.',
    );
  }
  if (
    workspaceScope &&
    principal.workspaceScope !== workspaceScope &&
    !principal.permittedWorkspaceScopes.includes('*') &&
    !principal.permittedWorkspaceScopes.includes(workspaceScope)
  ) {
    throw protocolError(
      'SCOPE_MISMATCH',
      'The authenticated Host principal is outside the requested workspace scope.',
    );
  }
}

async function authenticateHttpOperation(
  transport,
  request,
  operation,
  routeParameters = {},
  body,
) {
  if (
    body &&
    ['authenticatedPrincipal', 'hostPrincipal', 'transportPrincipal'].some((field) =>
      Object.hasOwn(body, field),
    )
  ) {
    throw protocolError(
      'AUTHENTICATION_REQUIRED',
      'Request bodies cannot supply an authenticated Host principal.',
    );
  }
  const principal = await transport.authenticate(request, operation, routeParameters);
  assertPrincipalScope(
    principal,
    await Promise.resolve(transport.scopeFor(operation, routeParameters)),
  );
  return principal;
}

function isVerifiedAuthorizationDecision(decision) {
  return Boolean(
    decision &&
      typeof decision === 'object' &&
      !Array.isArray(decision) &&
      decision.allowed === true &&
      typeof decision.principalId === 'string' &&
      decision.principalId.trim() &&
      typeof decision.policyDecisionId === 'string' &&
      decision.policyDecisionId.trim() &&
      typeof decision.evaluatedAt === 'string' &&
      Number.isFinite(Date.parse(decision.evaluatedAt)) &&
      new Date(Date.parse(decision.evaluatedAt)).toISOString() ===
        decision.evaluatedAt &&
      typeof decision.policyVersion === 'string' &&
      decision.policyVersion.trim(),
  );
}

function withAuthorizationDeadline(operation, timeoutMs = 5_000) {
  const boundedTimeout = Math.max(10, Math.min(Number(timeoutMs) || 5_000, 30_000));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Authorization decision deadline exceeded.')),
      boundedTimeout,
    );
    Promise.resolve(operation).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isMatchingApprovalDecision(decision, criteria) {
  if (
    !decision ||
    decision.decision !== 'approved' ||
    decision.decisionId !== criteria.decisionId ||
    decision.invocationId !== criteria.invocationId ||
    decision.actionKey !== criteria.actionKey ||
    typeof criteria.approvalActionDigest !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(criteria.approvalActionDigest) ||
    decision.approvalActionDigest !== criteria.approvalActionDigest ||
    decision.organizationScope !== criteria.organizationScope ||
    (decision.workspaceScope || undefined) !== (criteria.workspaceScope || undefined)
  ) {
    return false;
  }
  const expiresAt = Date.parse(decision.expiresAt || decision.validUntil || '');
  return Number.isFinite(expiresAt) && expiresAt > Date.parse(criteria.now);
}

function assertFreshConnectionRevocation(revocation, connection, passport) {
  if (
    !revocation ||
    revocation.status !== 'active' ||
    !['fresh', 'nearing_expiry'].includes(revocation.freshness)
  ) {
    throw protocolError(
      'REVOKED',
      'Fresh active Connection revocation state is required in production mode.',
    );
  }
  const bindings = [
    ['subjectType', 'connection'],
    ['subjectReference', connection.connectionId],
    ['connectionId', connection.connectionId],
    ['organizationScope', connection.organizationScope],
    ['workspaceScope', connection.workspaceScope],
    ['issuer', passport.issuer],
  ];
  for (const [field, expected] of bindings) {
    if (
      revocation[field] !== undefined &&
      (revocation[field] || undefined) !== (expected || undefined)
    ) {
      throw protocolError('REVOKED', 'The Connection revocation state is not correctly bound.');
    }
  }
  if (
    revocation.sequence !== undefined &&
    (!Number.isSafeInteger(revocation.sequence) || revocation.sequence < 1)
  ) {
    throw protocolError('REVOKED', 'The Connection revocation sequence is invalid.');
  }
}

async function handleHttp(agent, request, response, transport) {
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  try {
    const url = new URL(request.url, 'http://localhost');
    const baseUrl = `http://${request.headers.host}`;
    let result;
    if (request.method === 'GET' && url.pathname === '/.well-known/ghostbridge') {
      result = agent.getDiscovery(baseUrl);
    } else if (request.method === 'GET' && url.pathname === '/ghostbridge/passport') {
      result = agent.getPassport();
    } else if (
      request.method === 'GET' &&
      url.pathname === '/ghostbridge/capabilities/search'
    ) {
      const authenticatedPrincipal = await authenticateHttpOperation(
        transport,
        request,
        'capability_search',
        {
          organizationScope: url.searchParams.get('organizationScope') || '',
          workspaceScope: url.searchParams.get('workspaceScope') || undefined,
        },
      );
      result = await agent.searchCapabilities({
        query: url.searchParams.get('query') || '',
        organizationScope: url.searchParams.get('organizationScope') || '',
        workspaceScope: url.searchParams.get('workspaceScope') || undefined,
        riskCategories: url.searchParams.getAll('riskCategory'),
        sideEffectCategories: url.searchParams.getAll('sideEffectCategory'),
        approvalRequired: url.searchParams.has('approvalRequired')
          ? url.searchParams.get('approvalRequired') === 'true'
          : undefined,
        agentIds: url.searchParams.getAll('agentId'),
        limit: url.searchParams.get('limit'),
        cursor: url.searchParams.get('cursor') || undefined,
        authenticatedPrincipal,
      });
    } else if (
      request.method === 'GET' &&
      url.pathname.startsWith('/ghostbridge/capabilities/')
    ) {
      const authenticatedPrincipal = await authenticateHttpOperation(
        transport,
        request,
        'capability_details',
        {
          organizationScope: url.searchParams.get('organizationScope') || '',
          workspaceScope: url.searchParams.get('workspaceScope') || undefined,
        },
      );
      result = await agent.getCapabilityDetails({
        agentId: url.searchParams.get('agentId') || undefined,
        capabilityKey: decodeURIComponent(url.pathname.slice('/ghostbridge/capabilities/'.length)),
        capabilityVersion: url.searchParams.get('capabilityVersion') || undefined,
        organizationScope: url.searchParams.get('organizationScope') || '',
        workspaceScope: url.searchParams.get('workspaceScope') || undefined,
        authenticatedPrincipal,
      });
    } else if (request.method === 'GET' && url.pathname === '/ghostbridge/capabilities') {
      result = { items: agent.listCapabilities() };
    } else {
      const grantResolve = /^\/ghostbridge\/install-grants\/([^/]+)\/resolve$/.exec(url.pathname);
      const grantRedeem = /^\/ghostbridge\/install-grants\/([^/]+)\/redeem$/.exec(url.pathname);
      const taskPath = /^\/ghostbridge\/tasks\/([^/]+)$/.exec(url.pathname);
      const receiptPath = /^\/ghostbridge\/receipts\/([^/]+)$/.exec(url.pathname);
      const approvalPath = /^\/ghostbridge\/approvals\/([^/]+)\/decisions$/.exec(url.pathname);
      const revocationPath = /^\/ghostbridge\/revocations\/([^/]+)\/([^/]+)$/.exec(url.pathname);
      if (
        request.method === 'POST' &&
        url.pathname === '/ghostbridge/install-grants/resolve'
      ) {
        const body = await readBody(request);
        result = agent.trustedInstallResolutionConfigured
          ? await agent.resolveInstallGrantTrusted(body.grant, body)
          : await agent.resolveInstallGrant(body.grant, body);
      } else if (
        request.method === 'POST' &&
        url.pathname === '/ghostbridge/install-grants/redeem'
      ) {
        const body = await readBody(request);
        const authenticatedPrincipal = await authenticateHttpOperation(
          transport,
          request,
          'install_grant_redemption',
          { body },
          body,
        );
        result = await agent.redeemInstallGrant(
          body.grant,
          body,
          { authenticatedPrincipal },
        );
      } else if (request.method === 'POST' && grantResolve && agent.legacyGrantPathEnabled) {
        result = agent.trustedInstallResolutionConfigured
          ? await agent.resolveInstallGrantTrusted(
              decodeURIComponent(grantResolve[1]),
              await readBody(request),
            )
          : await agent.resolveInstallGrant(
              decodeURIComponent(grantResolve[1]),
              await readBody(request),
            );
      } else if (request.method === 'POST' && grantRedeem && agent.legacyGrantPathEnabled) {
        const body = await readBody(request);
        const authenticatedPrincipal = await authenticateHttpOperation(
          transport,
          request,
          'install_grant_redemption',
          { body },
          body,
        );
        result = await agent.redeemInstallGrant(
          decodeURIComponent(grantRedeem[1]),
          body,
          { authenticatedPrincipal },
        );
      } else if (request.method === 'POST' && url.pathname === '/ghostbridge/invocations') {
        const body = await readBody(request);
        const authenticatedPrincipal = await authenticateHttpOperation(
          transport,
          request,
          'invocation',
          { body },
          body,
        );
        result = await agent.invoke(
          body.connectionId,
          body.envelope,
          { authenticatedPrincipal },
        );
      } else if (request.method === 'GET' && taskPath) {
        const taskId = decodeURIComponent(taskPath[1]);
        await authenticateHttpOperation(transport, request, 'task_lookup', { taskId });
        result = await agent.getTask(taskId);
      } else if (request.method === 'POST' && taskPath && url.searchParams.get('action') === 'cancel') {
        const taskId = decodeURIComponent(taskPath[1]);
        const authenticatedPrincipal = await authenticateHttpOperation(
          transport,
          request,
          'task_cancellation',
          { taskId },
        );
        result = await agent.cancelTask(taskId, { authenticatedPrincipal });
      } else if (request.method === 'GET' && receiptPath) {
        const receiptId = decodeURIComponent(receiptPath[1]);
        await authenticateHttpOperation(transport, request, 'receipt_lookup', { receiptId });
        result = await agent.getReceipt(receiptId);
      } else if (request.method === 'POST' && approvalPath) {
        const decision = await readBody(request);
        const challengeId = decodeURIComponent(approvalPath[1]);
        const authenticatedPrincipal = await authenticateHttpOperation(
          transport,
          request,
          'approval_decision',
          { challengeId },
          decision,
        );
        if (decision.challengeId !== challengeId) {
          throw protocolError('APPROVAL_INVALID', 'The Approval Decision challenge does not match.');
        }
        result = await agent.submitApprovalDecision(decision, { authenticatedPrincipal });
      } else if (request.method === 'GET' && revocationPath) {
        const subjectType = decodeURIComponent(revocationPath[1]);
        const subjectReference = decodeURIComponent(revocationPath[2]);
        await authenticateHttpOperation(
          transport,
          request,
          'revocation_lookup',
          { subjectType, subjectReference },
        );
        result = await agent.checkRevocation(
          subjectType,
          subjectReference,
        );
        validateRevocation(result);
      } else if (
        request.method === 'POST' &&
        revocationPath &&
        decodeURIComponent(revocationPath[1]) === 'connection'
      ) {
        const body = await readBody(request);
        const subjectType = decodeURIComponent(revocationPath[1]);
        const subjectReference = decodeURIComponent(revocationPath[2]);
        await authenticateHttpOperation(
          transport,
          request,
          'connection_revocation',
          { subjectType, subjectReference },
          body,
        );
        result = await agent.revokeConnection(
          subjectReference,
          body.reasonCode || 'REVOKED_BY_HOST',
        );
      } else {
        response.statusCode = 404;
        result = protocolError('INVALID_MESSAGE', 'The protocol resource was not found.').toJSON();
      }
    }
    if (!response.statusCode || response.statusCode < 200) response.statusCode = 200;
    response.end(boundedSerialize(result));
  } catch (error) {
    const safeError =
      error instanceof GhostBridgeProtocolError
        ? error
        : protocolError('INTERNAL_ERROR', 'The protocol request could not be completed.');
    response.statusCode = statusForError(safeError.errorCode);
    response.end(boundedSerialize(safeError.toJSON()));
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > DEFAULT_LIMITS.maximumMessageBytes) {
        reject(protocolError('MESSAGE_TOO_LARGE', 'The protocol message exceeds the configured size.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        const parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        assertPlainData(parsed);
        resolve(parsed);
      } catch (error) {
        reject(
          error instanceof GhostBridgeProtocolError
            ? error
            : protocolError('INVALID_MESSAGE', 'The request body is not valid JSON.'),
        );
      }
    });
    request.on('error', reject);
  });
}

function statusForError(code) {
  if (code === 'INTERNAL_ERROR') return 500;
  if (code === 'TERMINAL_PERSISTENCE_REQUIRED') return 503;
  if (code === 'AUTHENTICATION_REQUIRED') return 401;
  if (code === 'AUTHORIZATION_DENIED') return 403;
  if (['REVOKED', 'CONNECTION_NOT_ACTIVE'].includes(code)) return 403;
  if (['SCOPE_MISMATCH', 'IDEMPOTENCY_CONFLICT', 'APPROVAL_REQUIRED'].includes(code)) return 409;
  if (code === 'TASK_NOT_FOUND') return 404;
  return 400;
}

module.exports = {
  AUDIT_EVENTS,
  createFileProtocolStores,
  createGhostBridgeAgent,
};
