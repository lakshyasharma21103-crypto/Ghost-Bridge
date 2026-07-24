'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const {
  AUTHENTICATION_MODES,
  DEFAULT_LIMITS,
  DEFAULT_PROFILE_DECLARATIONS,
  GhostBridgeProtocolError,
  PROTOCOL_VERSION,
  assertPlainData,
  boundedSerialize,
  digest,
  protocolError,
  transitionTask,
  validateApprovalDecision,
  validateCapabilityContract,
  validateContractValue,
  validateDelegation,
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
  signDocument,
  verifyRequest,
} = require('@ghostbridge/trust');

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
  'protocol.delegation.created',
  'protocol.delegation.rejected',
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
  let passport = validatePassport(options.passport, { clock: options.clock });
  let discoveryOverrides = options.discovery || {};
  let taskStore = options.taskStore || new Map();
  let receiptIssuer = options.receiptIssuer || defaultReceiptIssuer;
  let revocationResolver = options.revocationResolver || (() => ({ status: 'active' }));
  let authorizationHandler = options.authorization || (() => ({ allowed: true }));
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
  const installGrants = new Map();
  const connections = new Map();
  const receipts = new Map();
  const delegations = new Map();
  const challenges = new Map();
  const decisions = new Map();
  const idempotency = new Map();
  const metrics = new Map();
  const auditSink = typeof options.auditSink === 'function' ? options.auditSink : () => undefined;
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
        .filter(([key]) => !/(?:payload|input|output|credential|secret|token|policyRules)/i.test(key))
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
      if (!value || typeof value.get !== 'function' || typeof value.set !== 'function') {
        throw new TypeError('Task store must implement get() and set().');
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
      const prefix = String(baseUrl).replace(/\/$/, '');
      const discovery = {
        protocol: 'ghostbridge',
        supportedVersions: [PROTOCOL_VERSION],
        preferredVersion: PROTOCOL_VERSION,
        status: 'experimental',
        features: {
          tasks: true,
          approvals: true,
          delegation: true,
          receipts: true,
          revocation: true,
        },
        profiles: DEFAULT_PROFILE_DECLARATIONS,
        transports: ['http-json'],
        maximumMessageBytes: DEFAULT_LIMITS.maximumMessageBytes,
        endpoints: {
          passport: `${prefix}/ghostbridge/passport`,
          capabilities: `${prefix}/ghostbridge/capabilities`,
          capabilitySearch: `${prefix}/ghostbridge/capabilities/search`,
          capabilityDetails: `${prefix}/ghostbridge/capabilities/{capabilityKey}`,
          installGrantResolution: `${prefix}/ghostbridge/install-grants/{grant}/resolve`,
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
      await authorizeCapabilityAccess(scope, undefined, 'catalog');
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
      await authorizeCapabilityAccess(scope, options.capabilityKey, 'inspect');
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
      installGrants.set(grant.keyHash, grant);
      return { key, expiresAt: grant.expiresAt, grantReference: grantId };
    },
    resolveInstallGrant(key, scope = {}) {
      const grant = findGrant(key);
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
          .filter((capability) => grant.allowedCapabilityKeys.includes(capability.capabilityKey)),
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
    },
    async resolveInstallGrantTrusted(key, scope = {}) {
      const resolution = agent.resolveInstallGrant(key, scope);
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
    redeemInstallGrant(key, scope = {}) {
      const grant = findGrant(key);
      assertGrantScope(grant, scope, clock, { allowRedeemed: true });
      if (grant.status === 'redeemed') {
        const connection = connections.get(grant.connectionId);
        return { ...publicConnection(connection), idempotentReplay: true };
      }
      const selectedAuthenticationMode = scope.authenticationMode || authenticationModes[0];
      if (!authenticationModes.includes(selectedAuthenticationMode)) {
        throw protocolError(
          'NO_COMPATIBLE_AUTHENTICATION_MODE',
          'The selected authentication mode is not supported.',
        );
      }
      const enabledCapabilityKeys = scope.approvedCapabilityKeys || grant.allowedCapabilityKeys;
      if (
        !Array.isArray(enabledCapabilityKeys) ||
        enabledCapabilityKeys.some((key) => !grant.allowedCapabilityKeys.includes(key))
      ) {
        throw protocolError(
          'AUTHORIZATION_DENIED',
          'The requested capability enablement is not authorized by the Install Grant.',
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
        authenticationState: selectedAuthenticationMode === 'none' ? 'not_required' : 'configured',
        hostAudience: scope.hostAudience || options.hostAudience,
        enabledCapabilityKeys: [...enabledCapabilityKeys],
        disabledCapabilityKeys: grant.allowedCapabilityKeys.filter(
          (key) => !enabledCapabilityKeys.includes(key),
        ),
        createdAt: now,
        revocationReference: `revocations/connection/${connectionId}`,
      };
      grant.status = 'redeemed';
      grant.redeemedAt = now;
      grant.connectionId = connectionId;
      connections.set(connectionId, connection);
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
      });
      return { ...publicConnection(connection), idempotentReplay: false };
    },
    registerDelegation(grant) {
      validateDelegation(grant, { clock });
      delegations.set(grant.delegationId, structuredClone(grant));
      audit('protocol.delegation.created', {
        organizationScope: grant.organizationScope,
        workspaceScope: grant.workspaceScope,
        capabilityCount: grant.allowedCapabilityKeys.length,
      });
      return structuredClone(grant);
    },
    issueApprovalChallenge(input) {
      const now = clock();
      const challenge = {
        challengeId: input.challengeId || `challenge_${crypto.randomUUID()}`,
        invocationId: input.invocationId,
        organizationScope: input.organizationScope,
        workspaceScope: input.workspaceScope,
        actionKey: input.actionKey,
        safeSummary: input.safeSummary || `Approve ${input.actionKey}`,
        requiredRoleCategories: input.requiredRoleCategories || ['approver'],
        approvalLimits: input.approvalLimits || {},
        expiresAt: input.expiresAt || new Date(now + 300_000).toISOString(),
        requestedBy: input.requestedBy || passport.agentId,
        policyDecisionReference: input.policyDecisionReference || 'policy:draft-default',
        status: 'pending',
      };
      challenges.set(challenge.challengeId, challenge);
      metric('approval', 'requested');
      audit('protocol.approval.requested', {
        organizationScope: challenge.organizationScope,
        workspaceScope: challenge.workspaceScope,
        actionKey: challenge.actionKey,
      });
      return structuredClone(challenge);
    },
    submitApprovalDecision(decision) {
      const challenge = challenges.get(decision.challengeId);
      if (!challenge) throw protocolError('APPROVAL_INVALID', 'The Approval Challenge was not found.');
      validateApprovalDecision(decision, challenge, { clock });
      challenge.status = decision.decision === 'approved' ? 'approved' : 'rejected';
      decisions.set(decision.decisionId, {
        ...structuredClone(decision),
        invocationId: challenge.invocationId,
        organizationScope: challenge.organizationScope,
        workspaceScope: challenge.workspaceScope,
        actionKey: challenge.actionKey,
        used: false,
      });
      metric('approval', decision.decision);
      audit('protocol.approval.decided', {
        organizationScope: challenge.organizationScope,
        workspaceScope: challenge.workspaceScope,
        decision: decision.decision,
      });
      return structuredClone(decision);
    },
    async invoke(connectionId, envelope) {
      validateProtocolVersion(envelope?.protocolVersion);
      const connection = connections.get(connectionId);
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
      });
      if (revocation?.status === 'revoked') {
        throw protocolError('REVOKED', 'The Agent Connection has been revoked.');
      }
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
      if (idempotencyKey && idempotency.has(idempotencyKey)) {
        const recorded = idempotency.get(idempotencyKey);
        if (recorded.digest !== invocationDigest) {
          throw protocolError(
            'IDEMPOTENCY_CONFLICT',
            'The idempotency key was already used for a different Invocation.',
          );
        }
        return structuredClone({ ...recorded.result, idempotentReplay: true });
      }

      let delegation;
      if (registered.delegationRequired || envelope.delegationReference) {
        delegation = delegations.get(envelope.delegationReference);
        if (!delegation) {
          throw protocolError('DELEGATION_REQUIRED', 'A valid Delegation Grant is required.');
        }
        validateDelegation(delegation, {
          clock,
          capabilityKey: envelope.capabilityKey,
          organizationScope: envelope.organizationScope,
          workspaceScope: envelope.workspaceScope,
        });
        if (delegation.delegateAgentId !== passport.agentId) {
          throw protocolError('DELEGATION_INVALID', 'The Delegation Grant targets another agent.');
        }
      }

      if (registered.contract.approvalRequirement === 'required') {
        const decision = [...decisions.values()].find(
          (item) => item.decisionId === envelope.approvalReference,
        );
        if (
          !decision ||
          decision.decision !== 'approved' ||
          decision.used ||
          decision.invocationId !== envelope.invocationId ||
          decision.actionKey !== envelope.capabilityKey ||
          decision.organizationScope !== envelope.organizationScope ||
          decision.workspaceScope !== envelope.workspaceScope
        ) {
          const existing = [...challenges.values()].find(
            (item) =>
              item.invocationId === envelope.invocationId &&
              item.actionKey === envelope.capabilityKey,
          );
          const challenge =
            existing ||
            agent.issueApprovalChallenge({
              invocationId: envelope.invocationId,
              organizationScope: envelope.organizationScope,
              workspaceScope: envelope.workspaceScope,
              actionKey: envelope.capabilityKey,
              safeSummary: `Approve ${registered.contract.displayName}`,
              requiredRoleCategories: ['finance_manager'],
              approvalLimits: registered.approvalLimits || {},
            });
          if (approvalHandler) {
            await approvalHandler(structuredClone(challenge));
          }
          const task = createTask(envelope, registered.contract, clock, 'waiting_for_approval');
          taskStore.set(task.taskId, task);
          return { task: structuredClone(task), approvalChallenge: structuredClone(challenge) };
        }
        decision.used = true;
      }

      const task = createTask(envelope, registered.contract, clock);
      taskStore.set(task.taskId, task);
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
      const running = transitionTask(task, 'running', new Date(clock()).toISOString());
      taskStore.set(task.taskId, running);
      try {
        const abortController = new AbortController();
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
            delegationReference: envelope.delegationReference,
            delegation: delegation ? structuredClone(delegation) : undefined,
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
        }
        if (registered.contract.outputSchema) {
          validateContractValue(result.output, registered.contract.outputSchema, 'output');
        }
        if (delegation) {
          delegation.remainingInvocations =
            Number(delegation.remainingInvocations ?? delegation.maximumInvocations) - 1;
        }
        const completed = transitionTask(running, 'completed', new Date(clock()).toISOString());
        const receipt = await receiptIssuer({
          passport,
          contract: registered.contract,
          connection,
          envelope,
          task: completed,
          result,
          clock,
        });
        validateReceipt(receipt);
        receipts.set(receipt.receiptId, receipt);
        completed.receiptReference = receipt.receiptId;
        completed.nextActionCategory = 'none';
        taskStore.set(completed.taskId, completed);
        const response = {
          task: structuredClone(completed),
          receipt: structuredClone(receipt),
          output: structuredClone(result.output),
          idempotentReplay: false,
        };
        if (idempotencyKey) idempotency.set(idempotencyKey, { digest: invocationDigest, result: response });
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
        const failed = transitionTask(running, 'failed', new Date(clock()).toISOString());
        failed.safeFailureCode =
          error instanceof GhostBridgeProtocolError ? error.errorCode : 'INTERNAL_ERROR';
        failed.nextActionCategory = 'inspect';
        taskStore.set(failed.taskId, failed);
        metric('invocation', 'failed');
        throw error;
      }
    },
    getTask(taskId) {
      const task = taskStore.get(taskId);
      if (!task) throw protocolError('TASK_NOT_FOUND', 'The Execution Task was not found.');
      return structuredClone(task);
    },
    cancelTask(taskId) {
      const task = agent.getTask(taskId);
      if (!task.cancellationSupported || !['accepted', 'queued', 'running', 'waiting_for_approval'].includes(task.state)) {
        throw protocolError('TASK_NOT_CANCELLABLE', 'The Execution Task cannot be cancelled.');
      }
      const cancelled = transitionTask(task, 'cancelled', new Date(clock()).toISOString());
      taskStore.set(taskId, cancelled);
      return structuredClone(cancelled);
    },
    getReceipt(receiptId) {
      const receipt = receipts.get(receiptId);
      if (!receipt) throw protocolError('INVALID_MESSAGE', 'The Execution Receipt was not found.');
      return structuredClone(receipt);
    },
    checkRevocation(subjectType, subjectReference) {
      if (subjectType === 'connection') {
        const connection = connections.get(subjectReference);
        const status = connection?.status === 'revoked' ? 'revoked' : 'active';
        return {
          revocationId: `revocation_${subjectReference}`,
          subjectType,
          subjectReference,
          status,
          reasonCode: status === 'revoked' ? 'OWNER_REVOKED' : 'NOT_REVOKED',
          effectiveAt: connection?.revokedAt || connection?.createdAt || new Date(clock()).toISOString(),
          issuedBy: passport.issuer,
        };
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
      const connection = connections.get(connectionId);
      if (!connection) throw protocolError('CONNECTION_NOT_ACTIVE', 'The Agent Connection was not found.');
      connection.status = 'revoked';
      connection.revokedAt = new Date(clock()).toISOString();
      connection.revocationReasonCode = reasonCode;
      metric('revocation', 'revoked');
      audit('protocol.revocation.changed', {
        organizationScope: connection.organizationScope,
        workspaceScope: connection.workspaceScope,
        subjectType: 'connection',
        status: 'revoked',
      });
      return agent.checkRevocation('connection', connectionId);
    },
    getMetrics() {
      return [...metrics.entries()].map(([key, value]) => {
        const [category, outcome] = key.split(':');
        return { category, outcome, value };
      });
    },
    getConnectionCount() {
      return connections.size;
    },
    async listen(listenOptions = {}) {
      if (server) throw new Error('Ghost Bridge agent is already listening.');
      server = http.createServer((request, response) => handleHttp(agent, request, response));
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(listenOptions.port ?? 0, listenOptions.host || '127.0.0.1', resolve);
      });
      const address = server.address();
      const baseUrl = `http://${address.address.includes(':') ? `[${address.address}]` : address.address}:${address.port}`;
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

  async function authorizeCapabilityAccess(scope, capabilityKey, action) {
    if (!scope.organizationScope) {
      throw protocolError('SCOPE_REQUIRED', 'Organization scope is required.');
    }
    const activeConnection = [...connections.values()].find(
      (connection) =>
        connection.status === 'active' &&
        connection.organizationScope === scope.organizationScope &&
        (!connection.workspaceScope || connection.workspaceScope === scope.workspaceScope),
    );
    if (!activeConnection && action !== 'invoke') {
      throw protocolError('CONNECTION_NOT_ACTIVE', 'An active scoped Agent Connection is required.');
    }
    const decision = await authorizationHandler({
      action,
      capabilityKey,
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      connectionId: scope.connectionId || activeConnection?.connectionId,
      initiatingSubject: scope.initiatingSubject,
    });
    if (decision === false || decision?.allowed === false) {
      throw protocolError(
        decision?.code || 'SCOPE_MISMATCH',
        decision?.safeMessage || 'The capability is not authorized in this scope.',
      );
    }
  }

  function findGrant(key) {
    const grant = installGrants.get(digest({ key }));
    if (!grant) throw protocolError('INSTALL_GRANT_INVALID', 'The Install Grant is invalid.');
    return grant;
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

async function defaultReceiptIssuer({ passport, contract, connection, envelope, task, result, clock }) {
  const receipt = {
    receiptId: `receipt_${crypto.randomUUID()}`,
    invocationId: envelope.invocationId,
    taskId: task.taskId,
    agentId: passport.agentId,
    passportId: passport.passportId,
    passportVersion: passport.passportVersion,
    capabilityKey: contract.capabilityKey,
    capabilityVersion: contract.capabilityVersion,
    organizationScope: connection.organizationScope,
    ...(connection.workspaceScope ? { workspaceScope: connection.workspaceScope } : {}),
    outcome: result.outcome || 'completed',
    outputContractReference: contract.outputContractReference,
    startedAt: task.startedAt,
    completedAt: task.completedAt || new Date(clock()).toISOString(),
    attemptCount: 1,
    ...(envelope.approvalReference ? { approvalReference: envelope.approvalReference } : {}),
    ...(envelope.delegationReference ? { delegationReference: envelope.delegationReference } : {}),
    outputDigest: digest(result.output),
    evidenceDigest: digest({
      invocationId: envelope.invocationId,
      capabilityKey: envelope.capabilityKey,
      outcome: result.outcome || 'completed',
    }),
    billableStatusCategory: 'non_billable',
    nonBillableReason: 'deterministic_local_fixture',
    revocationStateAtExecution: 'active',
  };
  return receipt;
}

async function handleHttp(agent, request, response) {
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
      });
    } else if (
      request.method === 'GET' &&
      url.pathname.startsWith('/ghostbridge/capabilities/')
    ) {
      result = await agent.getCapabilityDetails({
        agentId: url.searchParams.get('agentId') || undefined,
        capabilityKey: decodeURIComponent(url.pathname.slice('/ghostbridge/capabilities/'.length)),
        capabilityVersion: url.searchParams.get('capabilityVersion') || undefined,
        organizationScope: url.searchParams.get('organizationScope') || '',
        workspaceScope: url.searchParams.get('workspaceScope') || undefined,
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
      if (request.method === 'POST' && grantResolve) {
        result = agent.trustedInstallResolutionConfigured
          ? await agent.resolveInstallGrantTrusted(
              decodeURIComponent(grantResolve[1]),
              await readBody(request),
            )
          : agent.resolveInstallGrant(decodeURIComponent(grantResolve[1]), await readBody(request));
      } else if (request.method === 'POST' && grantRedeem) {
        result = agent.redeemInstallGrant(decodeURIComponent(grantRedeem[1]), await readBody(request));
      } else if (request.method === 'POST' && url.pathname === '/ghostbridge/invocations') {
        const body = await readBody(request);
        result = await agent.invoke(body.connectionId, body.envelope);
      } else if (request.method === 'GET' && taskPath) {
        result = agent.getTask(decodeURIComponent(taskPath[1]));
      } else if (request.method === 'POST' && taskPath && url.searchParams.get('action') === 'cancel') {
        result = agent.cancelTask(decodeURIComponent(taskPath[1]));
      } else if (request.method === 'GET' && receiptPath) {
        result = agent.getReceipt(decodeURIComponent(receiptPath[1]));
      } else if (request.method === 'POST' && approvalPath) {
        const decision = await readBody(request);
        if (decision.challengeId !== decodeURIComponent(approvalPath[1])) {
          throw protocolError('APPROVAL_INVALID', 'The Approval Decision challenge does not match.');
        }
        result = agent.submitApprovalDecision(decision);
      } else if (request.method === 'GET' && revocationPath) {
        result = await agent.checkRevocation(
          decodeURIComponent(revocationPath[1]),
          decodeURIComponent(revocationPath[2]),
        );
        validateRevocation(result);
      } else if (
        request.method === 'POST' &&
        revocationPath &&
        decodeURIComponent(revocationPath[1]) === 'connection'
      ) {
        const body = await readBody(request);
        result = agent.revokeConnection(
          decodeURIComponent(revocationPath[2]),
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
  if (['REVOKED', 'CONNECTION_NOT_ACTIVE'].includes(code)) return 403;
  if (['SCOPE_MISMATCH', 'IDEMPOTENCY_CONFLICT', 'APPROVAL_REQUIRED'].includes(code)) return 409;
  if (code === 'TASK_NOT_FOUND') return 404;
  return 400;
}

module.exports = {
  AUDIT_EVENTS,
  createGhostBridgeAgent,
};
