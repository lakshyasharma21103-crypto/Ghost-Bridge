'use strict';

const crypto = require('node:crypto');
const {
  DEFAULT_LIMITS,
  DEFAULT_PROFILE_DECLARATIONS,
  GhostBridgeProtocolError,
  PROFILE_IDS,
  PROTOCOL_VERSION,
  assertCompatibility,
  assertPlainData,
  boundedSerialize,
  checkCompatibility,
  createInstallationPreview,
  negotiateVersion,
  protocolError,
  redactPublicData,
  validateCapabilityContract,
  validateConnectionOffer,
  validateContractValue,
  validateDiscovery,
  validatePassport,
  validateReceipt,
  validateRevocation,
  validateTask,
} = require('@ghostbridge/protocol-core');
const {
  AntiRollbackStore,
  RevocationCache,
  createNodeSecurityTransport,
  digest,
  discoverIssuer: discoverTrustIssuer,
  evaluateTrustPolicy,
  loadIssuerJwks,
  validateCapabilityManifest: validateSignedCapabilityManifest,
  validateIssuerMetadata,
  validateJwks,
  validateRevocationSet,
  verifyDocument,
  verifyReceipt: verifySignedReceipt,
} = require('@ghostbridge/trust');

const SAFE_TRANSPORT_HEADER_NAMES = new Set([
  'authorization',
  'ghostbridge-version',
  'idempotency-key',
  'traceparent',
  'tracestate',
  'x-request-id',
  'x-trace-id',
]);

class GhostBridgeError extends GhostBridgeProtocolError {
  constructor(code, message, options = {}) {
    super(code, message, options);
    this.name = new.target.name;
    this.code = this.errorCode;
  }
}

class ProtocolValidationError extends GhostBridgeError {}
class UnsupportedProtocolVersionError extends GhostBridgeError {}
class PassportValidationError extends GhostBridgeError {}
class InstallGrantError extends GhostBridgeError {}
class CapabilityNotFoundError extends GhostBridgeError {}
class ScopeMismatchError extends GhostBridgeError {}
class DelegationError extends GhostBridgeError {}
class DataContractViolationError extends GhostBridgeError {}
class ApprovalRequiredError extends GhostBridgeError {}
class DeadlineExceededError extends GhostBridgeError {}
class TaskCancelledError extends GhostBridgeError {}
class RevokedError extends GhostBridgeError {}
class RateLimitedError extends GhostBridgeError {}
class ProviderUnavailableError extends GhostBridgeError {}
class CompatibilityError extends GhostBridgeError {}
class AuthenticationError extends GhostBridgeError {}
class AuthorizationError extends GhostBridgeError {}
class ContractViolationError extends GhostBridgeError {}
class TaskFailedError extends GhostBridgeError {}

const ERROR_CLASS_BY_CODE = Object.freeze({
  INVALID_MESSAGE: ProtocolValidationError,
  MESSAGE_TOO_LARGE: ProtocolValidationError,
  UNSUPPORTED_PROTOCOL_VERSION: UnsupportedProtocolVersionError,
  NO_COMMON_PROTOCOL_VERSION: UnsupportedProtocolVersionError,
  CORE_PROFILE_REQUIRED: CompatibilityError,
  GOVERNED_PROFILE_REQUIRED: CompatibilityError,
  NO_COMPATIBLE_AUTHENTICATION_MODE: AuthenticationError,
  REQUIRED_EXTENSION_UNSUPPORTED: CompatibilityError,
  INVALID_PASSPORT: PassportValidationError,
  PASSPORT_EXPIRED: PassportValidationError,
  PASSPORT_SUSPENDED: PassportValidationError,
  PASSPORT_REVOKED: PassportValidationError,
  INSTALL_GRANT_INVALID: InstallGrantError,
  INSTALL_GRANT_EXPIRED: InstallGrantError,
  INSTALL_GRANT_ALREADY_REDEEMED: InstallGrantError,
  CAPABILITY_NOT_FOUND: CapabilityNotFoundError,
  CAPABILITY_VERSION_MISMATCH: CapabilityNotFoundError,
  INPUT_CONTRACT_VIOLATION: ContractViolationError,
  OUTPUT_CONTRACT_VIOLATION: ContractViolationError,
  AUTHENTICATION_REQUIRED: AuthenticationError,
  AUTHORIZATION_DENIED: AuthorizationError,
  SCOPE_REQUIRED: ScopeMismatchError,
  SCOPE_MISMATCH: ScopeMismatchError,
  DELEGATION_REQUIRED: DelegationError,
  DELEGATION_INVALID: DelegationError,
  DELEGATION_EXPIRED: DelegationError,
  DELEGATION_EXHAUSTED: DelegationError,
  DATA_CONTRACT_VIOLATION: DataContractViolationError,
  APPROVAL_REQUIRED: ApprovalRequiredError,
  APPROVAL_INVALID: ApprovalRequiredError,
  APPROVAL_EXPIRED: ApprovalRequiredError,
  DEADLINE_EXCEEDED: DeadlineExceededError,
  TASK_FAILED: TaskFailedError,
  TASK_CANCELLED: TaskCancelledError,
  REVOKED: RevokedError,
  RATE_LIMITED: RateLimitedError,
  PROVIDER_UNAVAILABLE: ProviderUnavailableError,
});

class GhostBridgeClient {
  constructor(options = {}) {
    this.targetPolicy = Object.freeze({
      localFixtureMode: options.localFixtureMode === true,
      allowedLocalOrigins: Object.freeze([...(options.allowedLocalOrigins || [])]),
    });
    this.baseUrl = options.baseUrl
      ? normalizeBaseUrl(options.baseUrl, this.targetPolicy)
      : undefined;
    this.installGrantResolver = options.installGrantResolver;
    this.issuerKeyResolver = options.issuerKeyResolver;
    this.authenticationHandler = options.authenticationHandler;
    this.hostSupport = Object.freeze({
      supportedProtocolVersions: options.supportedProtocolVersions || [PROTOCOL_VERSION],
      profiles: options.profiles || DEFAULT_PROFILE_DECLARATIONS,
      authenticationModes: options.supportedAuthenticationModes || ['none'],
      extensions: options.extensions || [],
      requiredProfiles: options.requiredProfiles || [PROFILE_IDS.core],
      requiredGovernedFeatures: options.requiredGovernedFeatures || {},
      ...(options.preferredAuthenticationMode
        ? { preferredAuthenticationMode: options.preferredAuthenticationMode }
        : {}),
    });
    this.timeoutMs = Math.max(50, Math.min(options.timeoutMs || 10_000, 120_000));
    this.transport = createClientTransport(options, {
      ...this.targetPolicy,
      timeoutMs: this.timeoutMs,
      maximumBytes: DEFAULT_LIMITS.maximumMessageBytes,
    });
    this.transportHeaders = options.transportHeaders;
    this.requestIdFactory = options.requestIdFactory || (() => `request_${crypto.randomUUID()}`);
    this.traceIdFactory = options.traceIdFactory || (() => `trace_${crypto.randomUUID()}`);
    this.trust = options.trust ? { ...options.trust } : undefined;
    this.trustMetadata = new Map();
    this.trustKeys = new Map();
    this.connectionTrustRecords = new Map();
    this.trustAntiRollback = options.trust?.antiRollbackStore || new AntiRollbackStore();
    this.revocationCache = options.trust?.revocationCache || new RevocationCache();
    this.discovery = null;
    this.connections = new Map();
    this.installPreviews = new Map();
    this.authenticatedGrants = new Map();
    this.approveAllFixtureCapabilities =
      this.targetPolicy.localFixtureMode && options.approveAllFixtureCapabilities === true;
    this.closed = false;
    if (!this.baseUrl && typeof this.installGrantResolver !== 'function') {
      throw new TypeError('A baseUrl or installGrantResolver is required.');
    }
    if (
      isNodeRuntime() &&
      options.serverMode !== false &&
      options.trust?.required === true &&
      options.trust?.localTestMode !== true &&
      (this.transport.securityProperties?.dnsRebindingResistant !== true ||
        this.transport.securityProperties?.addressPinning !== true ||
        this.transport.securityProperties?.tlsServerNameValidation !== true ||
        this.transport.securityProperties?.redirects !== 'rejected' ||
        this.transport.securityProperties?.streamingResponseLimit !== true)
    ) {
      throw new TypeError(
        'Trust-required Node use requires a DNS-pinned security transport.',
      );
    }
  }

  async discover() {
    if (!this.baseUrl) {
      throw createSdkError(
        'INSTALL_GRANT_INVALID',
        'Resolve an Install Grant before discovering an external agent.',
      );
    }
    const document = await this.request(`${this.baseUrl}/.well-known/ghostbridge`);
    validateDiscovery(document);
    negotiateVersion({
      remoteSupported: document.supportedVersions,
      remotePreferred: document.preferredVersion,
    });
    this.discovery = document;
    return document;
  }

  async discoverIssuer(issuerId, options = {}) {
    const metadata = await discoverTrustIssuer(issuerId, {
      timeoutMs: this.timeoutMs,
      ...(this.trust || {}),
      ...options,
      minimumMetadataSequence:
        options.minimumMetadataSequence ||
        this.trustMetadata.get(issuerId)?.metadataSequence,
    });
    this.trustAntiRollback.observe(
      'metadata',
      metadata.issuerId,
      metadata.metadataSequence,
      trustDocumentDigest(metadata),
    );
    this.trustMetadata.set(metadata.issuerId, metadata);
    return metadata;
  }

  async getIssuerMetadata(issuerId, options = {}) {
    if (options.refresh !== true && this.trustMetadata.has(issuerId)) {
      return structuredClone(this.trustMetadata.get(issuerId));
    }
    return this.discoverIssuer(issuerId, options);
  }

  async getIssuerKeys(metadataOrIssuer, options = {}) {
    const metadata =
      typeof metadataOrIssuer === 'string'
        ? await this.getIssuerMetadata(metadataOrIssuer, options)
        : metadataOrIssuer;
    const cacheKey = `${metadata.issuerId}:${metadata.metadataSequence}`;
    if (options.refresh !== true && this.trustKeys.has(cacheKey)) {
      return structuredClone(this.trustKeys.get(cacheKey));
    }
    const jwks = await loadIssuerJwks(metadata, {
      timeoutMs: this.timeoutMs,
      ...(this.trust || {}),
      ...options,
    });
    this.trustKeys.set(cacheKey, jwks);
    return jwks;
  }

  evaluateIssuerTrust(input = {}) {
    return evaluateTrustPolicy({
      organizationPolicy: input.organizationPolicy || this.trust?.organizationPolicy,
      workspacePolicy: input.workspacePolicy || this.trust?.workspacePolicy,
      ...input,
    });
  }

  async verifyPassport(passport, options = {}) {
    validatePassport(passport, { clock: options.clock });
    const rawMetadata =
      options.metadata ||
      this.trust?.metadata ||
      (await this.getIssuerMetadata(passport.issuer, options));
    const metadata = validateIssuerMetadata(rawMetadata, {
      ...(this.trust || {}),
      ...options,
      expectedIssuer: passport.issuer,
    });
    const jwks = validateJwks(
      options.jwks || this.trust?.jwks || (await this.getIssuerKeys(metadata, options)),
      { ...(this.trust || {}), ...options },
    );
    const metadataProof = verifyDocument(metadata, jwks, {
      ...(this.trust || {}),
      ...options,
      purpose: 'issuer_metadata',
      expectedIssuer: metadata.issuerId,
    });
    if (!metadata.rootKeyThumbprints.includes(metadataProof.keyThumbprint)) {
      throw createSdkError(
        'ISSUER_METADATA_INVALID',
        'Issuer metadata was not signed by a declared root key.',
      );
    }
    const proof = verifyDocument(passport, jwks, {
      ...(this.trust || {}),
      ...options,
      purpose: 'passport_signing',
      expectedIssuer: metadata.issuerId,
    });
    const policy = this.evaluateIssuerTrust({
      issuerId: metadata.issuerId,
      rootKeyThumbprint: metadataProof.keyThumbprint,
      highImpact: options.highImpact === true,
      organizationPolicy: options.organizationPolicy,
      workspacePolicy: options.workspacePolicy,
    });
    return Object.freeze({ metadataProof, proof, policy, metadata, jwks });
  }

  async verifyCapabilityManifest(manifest, contracts, passport, options = {}) {
    const jwks =
      options.jwks ||
      this.trust?.jwks ||
      (await this.getIssuerKeys(options.metadata || passport.issuer, options));
    return validateSignedCapabilityManifest(manifest, contracts, passport, {
      ...(this.trust || {}),
      ...options,
      jwks,
    });
  }

  async verifyInstallResolution(resolution, options = {}) {
    return this.verifyScopedTrustObject(
      resolution,
      'install_resolution_signing',
      options,
    );
  }

  async verifyConnectionOffer(connectionOffer, options = {}) {
    return this.verifyScopedTrustObject(
      connectionOffer,
      'connection_offer_signing',
      options,
    );
  }

  async verifyScopedTrustObject(document, purpose, options = {}) {
    const issuer = options.expectedIssuer || document.issuer;
    const metadata =
      options.metadata || this.trust?.metadata || (await this.getIssuerMetadata(issuer, options));
    const jwks =
      options.jwks || this.trust?.jwks || (await this.getIssuerKeys(metadata, options));
    return verifyDocument(document, jwks, {
      ...(this.trust || {}),
      ...options,
      purpose,
      expectedIssuer: metadata.issuerId,
    });
  }

  async getRevocationSet(issuerId, options = {}) {
    const metadata =
      options.metadata || this.trust?.metadata || (await this.getIssuerMetadata(issuerId, options));
    const jwks =
      options.jwks || this.trust?.jwks || (await this.getIssuerKeys(metadata, options));
    const document =
      options.revocationSet ||
      this.trust?.revocationSet ||
      (await this.request(metadata.revocationSetUri));
    const previous = this.revocationCache.get(metadata.issuerId)?.document;
    const verification = validateRevocationSet(document, jwks, {
      ...(this.trust || {}),
      ...options,
      expectedIssuer: metadata.issuerId,
      minimumSequence: previous?.sequence,
      previousSet: previous,
    });
    this.trustAntiRollback.observe(
      'revocation',
      metadata.issuerId,
      document.sequence,
      verification.digest,
      {
        contiguous: Boolean(previous),
        previousDigest: document.previousSetDigest,
      },
    );
    if (!previous || document.sequence > previous.sequence) {
      this.revocationCache.put(metadata.issuerId, document, verification);
    }
    return Object.freeze({ document, verification });
  }

  async refreshTrustState(issuerId, options = {}) {
    const metadata = await this.getIssuerMetadata(issuerId, { ...options, refresh: true });
    const jwks = await this.getIssuerKeys(metadata, { ...options, refresh: true });
    const revocation = await this.getRevocationSet(issuerId, { ...options, metadata, jwks });
    return Object.freeze({ metadata, jwks, revocation });
  }

  inspectConnectionTrust(connectionId) {
    const record = this.connectionTrustRecords.get(connectionId);
    if (!record) {
      throw createSdkError('CONNECTION_NOT_ACTIVE', 'No Connection Trust Record was found.');
    }
    return structuredClone(record);
  }

  async negotiateVersion(options = {}) {
    const discovery = await this.ensureDiscovery();
    try {
      return negotiateVersion({
        remoteSupported: discovery.supportedVersions,
        remotePreferred: discovery.preferredVersion,
        ...options,
      });
    } catch (error) {
      if (error instanceof GhostBridgeProtocolError) throw fromProtocolError(error);
      throw error;
    }
  }

  async getPassport() {
    const discovery = await this.ensureDiscovery();
    const passport = await this.request(resolveEndpoint(this.baseUrl, discovery.endpoints.passport));
    return validatePassport(passport);
  }

  async listCapabilities() {
    const discovery = await this.ensureDiscovery();
    const response = await this.request(resolveEndpoint(this.baseUrl, discovery.endpoints.capabilities));
    if (!Array.isArray(response.items)) {
      throw protocolError('INVALID_MESSAGE', 'The capability response is malformed.');
    }
    return response.items;
  }

  async searchCapabilities(options = {}) {
    const discovery = await this.ensureDiscovery();
    if (!options.organizationScope) {
      throw createSdkError('SCOPE_REQUIRED', 'Organization scope is required.');
    }
    if (!discovery.endpoints.capabilitySearch) {
      const capabilities = await this.listCapabilities();
      return localCapabilitySearch(capabilities, options);
    }
    const url = new URL(resolveEndpoint(this.baseUrl, discovery.endpoints.capabilitySearch));
    const scalarFields = [
      'query',
      'organizationScope',
      'workspaceScope',
      'approvalRequired',
      'limit',
      'cursor',
    ];
    for (const field of scalarFields) {
      if (options[field] !== undefined) url.searchParams.set(field, String(options[field]));
    }
    for (const [field, queryName] of [
      ['riskCategories', 'riskCategory'],
      ['sideEffectCategories', 'sideEffectCategory'],
      ['agentIds', 'agentId'],
    ]) {
      for (const value of options[field] || []) url.searchParams.append(queryName, String(value));
    }
    return this.request(url.toString(), { signal: options.signal });
  }

  async getCapabilityDetails(options = {}) {
    const discovery = await this.ensureDiscovery();
    if (!options.organizationScope) {
      throw createSdkError('SCOPE_REQUIRED', 'Organization scope is required.');
    }
    if (!discovery.endpoints.capabilityDetails) {
      const capability = (await this.listCapabilities()).find(
        (item) =>
          item.capabilityKey === options.capabilityKey &&
          (!options.capabilityVersion || item.capabilityVersion === options.capabilityVersion),
      );
      if (!capability) {
        throw createSdkError('CAPABILITY_NOT_FOUND', 'The requested capability is not available.');
      }
      return capability;
    }
    const endpoint = endpointWith(
      this.baseUrl,
      discovery.endpoints.capabilityDetails,
      '{capabilityKey}',
      options.capabilityKey,
    );
    const url = new URL(endpoint);
    for (const field of [
      'agentId',
      'capabilityVersion',
      'organizationScope',
      'workspaceScope',
    ]) {
      if (options[field] !== undefined) url.searchParams.set(field, String(options[field]));
    }
    return this.request(url.toString(), { signal: options.signal });
  }

  async resolveInstallGrant(grant, scope) {
    const discovery = await this.ensureDiscovery();
    const url = resolveEndpoint(this.baseUrl, discovery.endpoints.installGrantResolution);
    const response = await this.request(url, {
      method: 'POST',
      body: { grant, ...scope },
    });
    validatePassport(response.passport);
    validateConnectionOffer(response.connectionOffer);
    if (!Array.isArray(response.capabilities)) {
      throw protocolError('INVALID_MESSAGE', 'The Install Grant resolution omitted capabilities.');
    }
    response.capabilities.forEach(validateCapabilityContract);
    return response;
  }

  async previewInstall(options = {}) {
    const grant = options.grant;
    const scope = installScope(options);
    if (typeof grant !== 'string' || !grant) {
      throw createSdkError('INSTALL_GRANT_INVALID', 'An opaque Install Grant is required.');
    }
    await this.prepareInstallTarget(grant, scope);
    const discovery = await this.discover();
    const resolution = await this.resolveInstallGrant(grant, scope);
    const passport = validatePassport(resolution.passport);
    await verifyIssuer(this.issuerKeyResolver, passport);
    let trust;
    if (this.trust) {
      if (
        this.trust.required === true &&
        (!this.trust.hostAudience ||
          !passport.proof ||
          !resolution.capabilityManifest?.proof ||
          !resolution.proof ||
          !resolution.connectionOffer?.proof)
      ) {
        throw createSdkError(
          'PROOF_REQUIRED',
          'Trust-required installation is missing an audience or required signed object.',
        );
      }
      if (passport.proof && resolution.capabilityManifest) {
        const passportTrust = await this.verifyPassport(passport, {
          organizationPolicy: this.trust.organizationPolicy,
          workspacePolicy: this.trust.workspacePolicy,
          highImpact: this.hostSupport.requiredProfiles.includes(PROFILE_IDS.governedExecution),
        });
        const capabilityTrust = await this.verifyCapabilityManifest(
          resolution.capabilityManifest,
          resolution.capabilities,
          passport,
          passportTrust,
        );
        const installTrust = resolution.proof
          ? await this.verifyInstallResolution(resolution, {
              ...passportTrust,
              expectedAudience: this.trust.hostAudience,
            })
          : undefined;
        const connectionTrust = resolution.connectionOffer?.proof
          ? await this.verifyConnectionOffer(resolution.connectionOffer, {
              ...passportTrust,
              expectedAudience: this.trust.hostAudience,
            })
          : undefined;
        trust = Object.freeze({
          passport: passportTrust,
          capabilityManifest: capabilityTrust,
          installResolution: installTrust,
          connectionOffer: connectionTrust,
        });
        if (
          this.trust.required === true &&
          passportTrust.policy.category !== 'verified_and_trusted'
        ) {
          throw createSdkError(
            'AUTHORIZATION_DENIED',
            'The issuer trust policy did not approve this exact installation.',
          );
        }
        if (this.trust.required === true) {
          const revocation = await this.getRevocationSet(passport.issuer, passportTrust);
          if (!['fresh', 'nearing_expiry'].includes(revocation.verification.freshness)) {
            throw createSdkError(
              'REVOKED',
              'Current revocation information is required for installation.',
            );
          }
          trust = Object.freeze({ ...trust, revocation });
        }
      }
    }
    if (this.trust?.required === true && !trust) {
      throw createSdkError(
        'PROOF_REQUIRED',
        'Trust-required installation could not establish verified trust state.',
      );
    }
    const compatibilityInput = {
      host: this.hostSupport,
      discovery,
      passport,
      capabilities: resolution.capabilities,
      connectionOffer: resolution.connectionOffer,
    };
    let compatibility;
    try {
      compatibility = assertCompatibility(compatibilityInput);
    } catch (error) {
      if (error instanceof GhostBridgeProtocolError) throw fromProtocolError(error);
      throw error;
    }
    const preview = createInstallationPreview({
      ...compatibilityInput,
      compatibility,
      scope,
    });
    const key = installGrantCacheKey(grant, scope, this.trust);
    this.installPreviews.set(key, {
      preview,
      compatibility,
      resolution,
      scope,
      trust,
    });
    return Object.freeze({
      ...preview,
      grantReference: resolution.grantReference,
      redemptionState: resolution.redemptionState,
      ...(trust ? { trust: trust.passport.policy } : {}),
    });
  }

  async install(grantOrOptions, scope) {
    if (grantOrOptions && typeof grantOrOptions === 'object') {
      return this.installFromGrant(grantOrOptions);
    }
    return this.redeemInstallGrant(grantOrOptions, scope);
  }

  async installFromGrant(options = {}) {
    const grant = options.grant;
    const scope = installScope(options);
    if (typeof grant !== 'string' || !grant) {
      throw createSdkError('INSTALL_GRANT_INVALID', 'An opaque Install Grant is required.');
    }
    await this.prepareInstallTarget(grant, scope);
    const key = installGrantCacheKey(grant, scope, this.trust);
    const record = this.installPreviews.get(key) || {
      preview: await this.previewInstall(options),
      compatibility: undefined,
    };
    const cached = this.installPreviews.get(key) || record;
    const authenticationMode =
      cached.compatibility?.authentication?.selectedMode ||
      cached.preview?.authentication?.selectedMode ||
      'none';
    if (authenticationMode !== 'none' && !this.authenticatedGrants.has(key)) {
      if (typeof this.authenticationHandler !== 'function') {
        throw createSdkError(
          'AUTHENTICATION_REQUIRED',
          'The selected authentication mode requires a configured host handler.',
        );
      }
      const authenticationResult = await this.authenticationHandler({
        mode: authenticationMode,
        setupReference: cached.resolution?.connectionOffer?.authenticationSetupReference,
        agent: cached.preview.agent,
        scope,
      });
      this.authenticatedGrants.set(
        key,
        normalizeAuthenticationBinding(authenticationResult, {
          grantDigest: key,
          mode: authenticationMode,
          ...scope,
        }),
      );
    }
    const approvedCapabilityKeys =
      options.approvedCapabilityKeys ||
      (this.approveAllFixtureCapabilities
        ? cached.preview.capabilities?.map((capability) => capability.capabilityKey)
        : undefined);
    if (!Array.isArray(approvedCapabilityKeys) || approvedCapabilityKeys.length === 0) {
      throw createSdkError(
        'AUTHORIZATION_DENIED',
        'Explicit approvedCapabilityKeys are required for governed installation.',
      );
    }
    return this.redeemInstallGrant(grant, {
      ...scope,
      authenticationMode,
      approvedCapabilityKeys,
      ...(this.authenticatedGrants.get(key)
        ? { authenticationBinding: this.authenticatedGrants.get(key) }
        : {}),
    }, key);
  }

  async redeemInstallGrant(grant, scope, previewCacheKey) {
    const discovery = await this.ensureDiscovery();
    const template =
      discovery.endpoints.installGrantRedemption ||
      discovery.endpoints.installGrantResolution.replace(/\/resolve$/, '/redeem');
    const response = await this.request(
      resolveEndpoint(this.baseUrl, template),
      { method: 'POST', body: { grant, ...scope } },
    );
    if (
      response.protocolVersion !== PROTOCOL_VERSION ||
      !response.connectionId ||
      response.status !== 'active'
    ) {
      throw protocolError('INVALID_MESSAGE', 'The Connection response is malformed.');
    }
    this.connections.set(response.connectionId, response);
    const cached = this.installPreviews.get(
      previewCacheKey || installGrantCacheKey(grant, scope, this.trust),
    );
    if (cached?.trust) {
      this.connectionTrustRecords.set(response.connectionId, Object.freeze({
        connectionId: response.connectionId,
        issuerId: cached.resolution.passport.issuer,
        agentId: cached.resolution.passport.agentId,
        passportId: cached.resolution.passport.passportId,
        passportVersion: cached.resolution.passport.passportVersion,
        passportDigest: cached.trust.passport.proof.keyThumbprint
          ? crypto.createHash('sha256').update(boundedSerialize(cached.resolution.passport)).digest('base64url')
          : undefined,
        capabilityManifestDigest: cached.resolution.passport.capabilityManifestDigest,
        verifiedIssuerKeyId: cached.trust.passport.proof.kid,
        verifiedIssuerKeyThumbprint: cached.trust.passport.proof.keyThumbprint,
        trustProfileVersion: cached.resolution.passport.trustProfileVersion,
        selectedAuthenticationProfile: scope.authenticationMode || 'none',
        hostAudience: this.trust?.hostAudience,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        approvedCapabilities: scope.approvedCapabilityKeys || [],
        trustDecision: cached.trust.passport.policy.category,
        verifiedAt: new Date().toISOString(),
        status: 'active',
      }));
    }
    return response;
  }

  async invoke(connectionOrOptions, envelope) {
    let connectionId = connectionOrOptions;
    let selectedCapability;
    if (connectionOrOptions && typeof connectionOrOptions === 'object' && !envelope) {
      const options = connectionOrOptions;
      const installation = options.connectionId
        ? this.connections.get(options.connectionId)
        : uniqueConnectionForAgent(this.connections, options.agentId);
      if (!installation) {
        throw createSdkError(
          'CONNECTION_NOT_ACTIVE',
          'Install the target agent before invoking a capability.',
        );
      }
      assertInvocationScope(installation, options);
      selectedCapability = await this.getCapabilityDetails({
        agentId: options.agentId || installation.agentId,
        capabilityKey: options.capability,
        capabilityVersion: options.capabilityVersion,
        organizationScope: options.organizationScope || installation.organizationScope,
        workspaceScope: options.workspaceScope || installation.workspaceScope,
        signal: options.signal,
      });
      connectionId = options.connectionId || installation.connectionId;
      if (selectedCapability.inputSchema) {
        try {
          validateContractValue(options.input || {}, selectedCapability.inputSchema, 'input');
        } catch (error) {
          if (error instanceof GhostBridgeProtocolError) throw fromProtocolError(error);
          throw error;
        }
      }
      envelope = {
        protocolVersion: PROTOCOL_VERSION,
        invocationId: options.invocationId || `invocation_${crypto.randomUUID()}`,
        messageId: options.messageId || `message_${crypto.randomUUID()}`,
        organizationScope: options.organizationScope || installation.organizationScope,
        ...(options.workspaceScope || installation.workspaceScope
          ? { workspaceScope: options.workspaceScope || installation.workspaceScope }
          : {}),
        initiatingSubject: options.initiatingSubject || 'application',
        targetAgentId: options.agentId || installation.agentId,
        targetPassportVersion: installation.passportVersion,
        capabilityKey: selectedCapability.capabilityKey,
        capabilityVersion: selectedCapability.capabilityVersion,
        inputContractReference: selectedCapability.inputContractReference,
        ...(options.approvalReference ? { approvalReference: options.approvalReference } : {}),
        ...(options.delegationReference ? { delegationReference: options.delegationReference } : {}),
        ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
        deadline:
          typeof options.deadline === 'string'
            ? options.deadline
            : new Date(Date.now() + (options.timeoutMs || this.timeoutMs)).toISOString(),
        traceContext: options.traceContext || {},
        payload: options.input || {},
        payloadClassification: options.payloadClassification || [],
        requestedReceiptProfile: options.receiptProfile || 'standard',
      };
    }
    const discovery = await this.ensureDiscovery();
    const response = await this.request(resolveEndpoint(this.baseUrl, discovery.endpoints.invocations), {
      method: 'POST',
      body: { connectionId, envelope },
      requestId: envelope.requestId,
      traceId: envelope.traceContext?.traceId,
      idempotencyKey: envelope.idempotencyKey,
      signal: connectionOrOptions?.signal,
    });
    validateTask(response.task);
    if (response.receipt) validateReceipt(response.receipt);
    if (selectedCapability?.outputSchema && response.output !== undefined) {
      try {
        validateContractValue(response.output, selectedCapability.outputSchema, 'output');
      } catch (error) {
        if (error instanceof GhostBridgeProtocolError) throw fromProtocolError(error);
        throw error;
      }
    }
    return response;
  }

  async invokeAndWait(options, waitOptions = {}) {
    const response =
      typeof options === 'string'
        ? await this.invoke(options, waitOptions.envelope)
        : await this.invoke(options);
    if (isTerminalTask(response.task)) return response;
    const task = await this.waitForTask(response.task.taskId, waitOptions);
    const receipt = task.receiptReference ? await this.getReceipt(task.receiptReference) : undefined;
    return { ...response, task, receipt };
  }

  async waitForTask(taskId, options = {}) {
    let latest;
    for await (const task of this.watchTask(taskId, options)) {
      latest = task;
      if (isTerminalTask(task)) return task;
    }
    return latest;
  }

  async *watchTask(taskId, options = {}) {
    const maximumAttempts = Math.max(1, Math.min(options.maximumAttempts || 100, 1_000));
    const minimumDelayMs = Math.max(10, Math.min(options.minimumDelayMs || 100, 10_000));
    const maximumDelayMs = Math.max(minimumDelayMs, Math.min(options.maximumDelayMs || 2_000, 30_000));
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      if (options.signal?.aborted) {
        throw createSdkError('TASK_CANCELLED', 'Task watching was cancelled.');
      }
      const task = await this.getTask(taskId, { signal: options.signal });
      yield task;
      if (isTerminalTask(task)) return;
      const delay = Math.min(maximumDelayMs, minimumDelayMs * 2 ** Math.min(attempt, 5));
      await abortableDelay(delay, options.signal);
    }
    throw createSdkError('DEADLINE_EXCEEDED', 'Task watching exceeded its bounded attempts.', {
      retryable: true,
    });
  }

  async getTask(taskId, options = {}) {
    const discovery = await this.ensureDiscovery();
    const response = await this.request(
      endpointWith(this.baseUrl, discovery.endpoints.tasks, '{taskId}', taskId),
      { signal: options.signal },
    );
    return validateTask(response);
  }

  async cancelTask(taskId) {
    const discovery = await this.ensureDiscovery();
    const endpoint = endpointWith(this.baseUrl, discovery.endpoints.tasks, '{taskId}', taskId);
    const response = await this.request(`${endpoint}?action=cancel`, { method: 'POST', body: {} });
    return validateTask(response);
  }

  async submitApprovalDecision(challengeId, decision) {
    const discovery = await this.ensureDiscovery();
    return this.request(
      endpointWith(this.baseUrl, discovery.endpoints.approvals, '{challengeId}', challengeId),
      { method: 'POST', body: decision },
    );
  }

  async getReceipt(receiptId) {
    const discovery = await this.ensureDiscovery();
    const response = await this.request(
      endpointWith(this.baseUrl, discovery.endpoints.receipts, '{receiptId}', receiptId),
    );
    return validateReceipt(response);
  }

  async verifyReceipt(receiptOrId, options = {}) {
    const receipt =
      typeof receiptOrId === 'string' ? await this.getReceipt(receiptOrId) : receiptOrId;
    validateReceipt(receipt);
    if (options.passport && (options.jwks || this.trust?.jwks)) {
      const verification = verifySignedReceipt(
        receipt,
        options.passport,
        options.jwks || this.trust.jwks,
        { ...(this.trust || {}), ...options },
      );
      return {
        valid: true,
        proofState: 'valid',
        historicalStatus: verification.historicalStatus,
        verification,
        receipt,
      };
    }
    if (!receipt.proof) {
      return { valid: false, proofState: 'invalid', receipt };
    }
    const proofValid = options.verifier
      ? await options.verifier.verify(receipt, receipt.proof)
      : undefined;
    return {
      valid: proofValid === true,
      proofState: proofValid === undefined ? 'unverified' : proofValid ? 'valid' : 'invalid',
      receipt,
    };
  }

  async checkRevocation(subjectType, subjectReference) {
    const discovery = await this.ensureDiscovery();
    const template = discovery.endpoints.revocations;
    if (!template?.includes('{subjectType}') || !template?.includes('{subjectReference}')) {
      throw createSdkError('INVALID_MESSAGE', 'Discovery contains an invalid revocation endpoint.');
    }
    const endpoint = resolveEndpoint(
      this.baseUrl,
      template
        .replace('{subjectType}', encodeURIComponent(subjectType))
        .replace('{subjectReference}', encodeURIComponent(subjectReference)),
    );
    const response = await this.request(endpoint);
    return validateRevocation(response);
  }

  async revokeConnection(connectionId, options = {}) {
    const discovery = await this.ensureDiscovery();
    const template = discovery.endpoints.revocations;
    const endpoint = resolveEndpoint(
      this.baseUrl,
      template
        .replace('{subjectType}', 'connection')
        .replace('{subjectReference}', encodeURIComponent(connectionId)),
    );
    const response = await this.request(endpoint, {
      method: 'POST',
      body: { reasonCode: options.reasonCode || 'REVOKED_BY_HOST' },
    });
    this.connections.delete(connectionId);
    return validateRevocation(response);
  }

  async ensureDiscovery() {
    if (this.closed) throw new Error('Ghost Bridge client is closed.');
    return this.discovery || this.discover();
  }

  async prepareInstallTarget(grant, scope) {
    if (typeof this.installGrantResolver !== 'function') {
      if (!this.baseUrl) {
        throw createSdkError('INSTALL_GRANT_INVALID', 'The Install Grant cannot be resolved.');
      }
      return this.baseUrl;
    }
    const resolved = await this.installGrantResolver({ grant, ...scope });
    const target =
      typeof resolved === 'string'
        ? resolved
        : resolved && typeof resolved === 'object'
          ? resolved.baseUrl
          : undefined;
    if (!target) {
      throw createSdkError(
        'INSTALL_GRANT_INVALID',
        'The Install Grant resolver did not return a machine-facing target.',
      );
    }
    const normalized = normalizeBaseUrl(target, this.targetPolicy);
    if (this.baseUrl !== normalized) {
      this.baseUrl = normalized;
      this.discovery = null;
    }
    return normalized;
  }

  close() {
    this.closed = true;
    this.discovery = null;
    this.connections.clear();
    this.installPreviews.clear();
    this.authenticatedGrants.clear();
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('Ghost Bridge request timed out.')),
      this.timeoutMs,
    );
    const requestId = options.requestId || this.requestIdFactory();
    const traceId = options.traceId || this.traceIdFactory();
    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    try {
      const transportHeaders =
        typeof this.transportHeaders === 'function'
          ? await this.transportHeaders({ url, method: options.method || 'GET' })
          : this.transportHeaders || {};
      assertSafeTransportHeaders(transportHeaders);
      const response = await this.transport.request(url, {
        method: options.method || 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'ghostbridge-version': PROTOCOL_VERSION,
          'x-request-id': requestId,
          'x-trace-id': traceId,
          ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
          ...transportHeaders,
        },
        body: options.body === undefined ? undefined : boundedSerialize(options.body),
        signal: controller.signal,
        timeoutMs: this.timeoutMs,
        maximumBytes: DEFAULT_LIMITS.maximumMessageBytes,
        expectedContentTypes: ['application/json'],
        allowQuery: true,
      });
      if (response.status >= 300 && response.status < 400) {
        throw protocolError('INVALID_MESSAGE', 'Protocol redirects are rejected.');
      }
      const contentType = String(response.headers.get('content-type') || '')
        .split(';', 1)[0]
        .trim()
        .toLowerCase();
      if (contentType !== 'application/json') {
        throw protocolError('INVALID_MESSAGE', 'The peer returned an unexpected content type.');
      }
      const announcedLength = Number(response.headers.get('content-length') || 0);
      if (announcedLength > DEFAULT_LIMITS.maximumMessageBytes) {
        throw protocolError('MESSAGE_TOO_LARGE', 'The protocol response exceeds the configured size.');
      }
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > DEFAULT_LIMITS.maximumMessageBytes) {
        throw protocolError('MESSAGE_TOO_LARGE', 'The protocol response exceeds the configured size.');
      }
      let document;
      try {
        document = text ? JSON.parse(text) : {};
        assertPlainData(document);
      } catch (error) {
        if (error instanceof GhostBridgeProtocolError) throw error;
        throw protocolError('INVALID_MESSAGE', 'The peer returned malformed JSON.');
      }
      if (!response.ok) {
        throw createSdkError(
          document.errorCode || 'INTERNAL_ERROR',
          document.safeMessage || 'The protocol request was rejected.',
          {
            protocolVersion: document.protocolVersion,
            retryable: document.retryable,
            retryAfterMs: document.retryAfterMs,
            requestId: document.requestId || requestId,
            traceId: document.traceId || traceId,
            details: document.details,
          },
        );
      }
      return document;
    } catch (error) {
      if (error instanceof GhostBridgeError) throw error;
      if (error instanceof GhostBridgeProtocolError) throw fromProtocolError(error);
      if (error?.code === 'RESPONSE_TOO_LARGE') {
        throw fromProtocolError(
          protocolError('MESSAGE_TOO_LARGE', 'The protocol response exceeds the configured size.'),
        );
      }
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        if (options.signal?.aborted) {
          throw createSdkError('TASK_CANCELLED', 'The protocol request was cancelled.', {
            retryable: false,
            requestId,
            traceId,
          });
        }
        throw createSdkError('DEADLINE_EXCEEDED', 'The protocol request timed out.', {
          retryable: true,
          requestId,
          traceId,
        });
      }
      throw createSdkError('PROVIDER_UNAVAILABLE', 'The Ghost Bridge peer is unavailable.', {
        retryable: true,
        requestId,
        traceId,
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}

function createSdkError(code, message, options = {}) {
  const ErrorClass = ERROR_CLASS_BY_CODE[code] || GhostBridgeError;
  return new ErrorClass(code, message, options);
}

function fromProtocolError(error) {
  return createSdkError(error.errorCode, error.safeMessage || error.message, {
    protocolVersion: error.protocolVersion,
    retryable: error.retryable,
    retryAfterMs: error.retryAfterMs,
    requestId: error.requestId,
    traceId: error.traceId,
    details: error.details,
  });
}

function classifyRetry(error, options = {}) {
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(String(options.method || 'GET').toUpperCase());
  const negotiatedIdempotency =
    Boolean(options.idempotencyKey) &&
    ['required', 'optional'].includes(options.capabilityIdempotencySupport) &&
    options.peerAcknowledgedIdempotency === true &&
    options.sameRequestFingerprint === true &&
    options.ambiguousRemoteOutcome !== true;
  const retryableCode = ['RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'DEADLINE_EXCEEDED'].includes(
    error?.code || error?.errorCode,
  );
  return Object.freeze({
    retryable: retryableCode && (safeMethod || negotiatedIdempotency),
    reason: retryableCode
      ? safeMethod || negotiatedIdempotency
        ? 'transient_safe'
        : 'unsafe_side_effect'
      : 'permanent',
    retryAfterMs: Number.isFinite(error?.retryAfterMs) ? error.retryAfterMs : undefined,
  });
}

function createClientTransport(options, policy) {
  if (options.transport !== undefined) {
    if (
      !options.transport ||
      typeof options.transport.request !== 'function' ||
      !options.transport.securityProperties ||
      typeof options.transport.securityProperties !== 'object'
    ) {
      throw new TypeError(
        'transport must expose request(url, options) and declared securityProperties.',
      );
    }
    return options.transport;
  }
  if (typeof options.fetch === 'function') {
    return createFetchSecurityTransport(options.fetch, {
      implementation: 'caller_fetch',
    });
  }
  if (isNodeRuntime()) {
    return createNodeSecurityTransport(policy);
  }
  if (typeof globalThis.fetch !== 'function') {
    throw new TypeError('A Ghost Bridge transport implementation is required.');
  }
  return createFetchSecurityTransport(globalThis.fetch.bind(globalThis), {
    implementation: 'browser_fetch',
  });
}

function createFetchSecurityTransport(fetchImplementation, properties = {}) {
  return Object.freeze({
    securityProperties: Object.freeze({
      dnsRebindingResistant: false,
      addressPinning: false,
      tlsServerNameValidation: 'user-agent-managed',
      redirects: 'rejected',
      streamingResponseLimit: true,
      ...properties,
    }),
    async request(urlValue, requestOptions = {}) {
      const maximumBytes = boundedTransportInteger(
        requestOptions.maximumBytes,
        1,
        16_777_216,
        DEFAULT_LIMITS.maximumMessageBytes,
      );
      const url = validateFetchTransportUrl(urlValue, requestOptions);
      const response = await fetchImplementation(url.toString(), {
        method: requestOptions.method || 'GET',
        headers: requestOptions.headers,
        body: requestOptions.body,
        signal: requestOptions.signal,
        redirect: 'manual',
        credentials: 'omit',
      });
      if (!response || typeof response !== 'object' || !response.headers) {
        throw transportFailure('TRANSPORT_FAILURE', 'The transport returned an invalid response.');
      }
      if (Number(response.status) >= 300 && Number(response.status) < 400) {
        await cancelResponseBody(response);
        throw transportFailure('REDIRECT_REJECTED', 'Protocol redirects are rejected.');
      }
      assertFetchResponseType(response, requestOptions.expectedContentTypes);
      const declaredLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
        await cancelResponseBody(response);
        throw transportFailure(
          'RESPONSE_TOO_LARGE',
          'The protocol response exceeds its configured size limit.',
        );
      }
      const bytes = await readBoundedFetchBody(response, maximumBytes);
      return Object.freeze({
        status: Number(response.status),
        ok: response.ok === true,
        headers: response.headers,
        async text() {
          return new TextDecoder().decode(bytes);
        },
      });
    },
  });
}

function validateFetchTransportUrl(value, options = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw transportFailure('UNSAFE_DISCOVERY_TARGET', 'The protocol target URL is invalid.');
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    (url.search && options.allowQuery !== true)
  ) {
    throw transportFailure('UNSAFE_DISCOVERY_TARGET', 'The protocol target URL is unsafe.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw transportFailure('UNSAFE_DISCOVERY_TARGET', 'The protocol target scheme is invalid.');
  }
  return url;
}

function assertFetchResponseType(response, expectedTypes = ['application/json']) {
  const expected = new Set(expectedTypes.map((item) => String(item).toLowerCase()));
  const actual = String(response.headers.get('content-type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (!expected.has(actual)) {
    void cancelResponseBody(response);
    throw transportFailure(
      'UNEXPECTED_CONTENT_TYPE',
      'The protocol response has an unexpected content type.',
    );
  }
}

async function readBoundedFetchBody(response, maximumBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw transportFailure(
      'TRANSPORT_FAILURE',
      'The Fetch transport must expose a readable response stream.',
    );
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = result.value instanceof Uint8Array
        ? result.value
        : new Uint8Array(result.value);
      size += chunk.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw transportFailure(
          'RESPONSE_TOO_LARGE',
          'The protocol response exceeds its configured size limit.',
        );
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function cancelResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort after the response has already been rejected.
  }
}

function assertSafeTransportHeaders(headers) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    throw new TypeError('transportHeaders must be a bounded plain object.');
  }
  for (const [name, value] of Object.entries(headers)) {
    const normalized = String(name).toLowerCase();
    if (
      !SAFE_TRANSPORT_HEADER_NAMES.has(normalized) ||
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > 4_096 ||
      /[\r\n]/.test(value)
    ) {
      throw new TypeError(`Unsafe Native Client transport header: ${normalized}.`);
    }
  }
}

function boundedTransportInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum
    ? number
    : fallback;
}

function transportFailure(code, message) {
  const error = new Error(message);
  error.name = 'SecureTransportError';
  error.code = code;
  return error;
}

function isNodeRuntime() {
  return (
    typeof process !== 'undefined' &&
    process?.versions?.node &&
    typeof require === 'function'
  );
}

function localCapabilitySearch(capabilities, options) {
  const tokens = String(options.query || '').toLowerCase().split(/[^a-z0-9._-]+/).filter(Boolean);
  const rows = capabilities
    .filter((item) => item.status === 'active')
    .map((item) => ({
      item,
      score: tokens.reduce(
        (score, token) =>
          score +
          (item.capabilityKey.toLowerCase().includes(token) ? 8 : 0) +
          (item.displayName.toLowerCase().includes(token) ? 5 : 0) +
          (item.safeDescription.toLowerCase().includes(token) ? 2 : 0),
        0,
      ),
    }))
    .filter((row) => !tokens.length || row.score > 0)
    .sort((left, right) => right.score - left.score || left.item.capabilityKey.localeCompare(right.item.capabilityKey));
  const limit = Math.max(1, Math.min(Number(options.limit) || 20, 50));
  return {
    items: rows.slice(0, limit).map(({ item }) => ({
      capabilityKey: item.capabilityKey,
      capabilityDisplayName: item.displayName,
      safeDescription: item.safeDescription,
      riskCategory: item.riskCategory,
      sideEffectCategory: item.sideEffectCategory,
      approvalRequired: item.approvalRequirement === 'required',
      availabilityState: 'available',
    })),
    totalBounded: Math.min(rows.length, 10_000),
  };
}

function isTerminalTask(task) {
  return ['completed', 'failed', 'cancelled', 'timed_out', 'rejected', 'revoked'].includes(task?.state);
}

function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const complete = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timeout = setTimeout(complete, ms);
    const abort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      reject(createSdkError('TASK_CANCELLED', 'Task watching was cancelled.'));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

function createGhostBridgeClient(options) {
  return new GhostBridgeClient(options);
}

async function discover(baseUrl, options = {}) {
  return createGhostBridgeClient({ ...options, baseUrl }).discover();
}

function installScope(options = {}) {
  if (!options.organizationScope) {
    throw createSdkError('SCOPE_REQUIRED', 'Organization scope is required.');
  }
  return {
    organizationScope: String(options.organizationScope),
    ...(options.workspaceScope ? { workspaceScope: String(options.workspaceScope) } : {}),
  };
}

async function verifyIssuer(resolver, passport) {
  if (!resolver) return { status: 'not_configured' };
  const operation =
    typeof resolver === 'function'
      ? resolver
      : typeof resolver.resolveIssuerKey === 'function'
        ? resolver.resolveIssuerKey.bind(resolver)
        : undefined;
  if (!operation) throw new TypeError('issuerKeyResolver must be a function or resolver object.');
  const result = await operation(passport.issuer, passport.publicVerificationReference);
  if (!result) {
    throw createSdkError('INVALID_PASSPORT', 'The Agent Passport issuer could not be verified.');
  }
  return { status: 'verified' };
}

function normalizeAuthenticationBinding(result, context) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw createSdkError(
      'AUTHENTICATION_REQUIRED',
      'Authentication must return an opaque credential or transport binding.',
    );
  }
  assertPlainData(result);
  const original = boundedSerialize(result);
  const sanitized = boundedSerialize(redactPublicData(result));
  if (original !== sanitized || /(?:access|refresh|bearer)[-_]?token|authorization|cookie/i.test(original)) {
    throw createSdkError(
      'INVALID_MESSAGE',
      'Authentication handlers must return only safe connection references.',
    );
  }
  if (!result.credentialReference && !result.transportBindingReference) {
    throw createSdkError(
      'AUTHENTICATION_REQUIRED',
      'Authentication did not return an opaque binding reference.',
    );
  }
  return Object.freeze({
    ...structuredClone(result),
    grantDigest: context.grantDigest,
    authenticationMode: context.mode,
    organizationScope: context.organizationScope,
    ...(context.workspaceScope ? { workspaceScope: context.workspaceScope } : {}),
    ...(context.expiresAt ? { expiresAt: context.expiresAt } : {}),
  });
}

function installGrantCacheKey(grant, scope = {}, trust = {}) {
  return crypto
    .createHash('sha256')
    .update(
      boundedSerialize({
        grantDigest: crypto.createHash('sha256').update(String(grant)).digest('hex'),
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope || null,
        hostAudience: trust?.hostAudience || null,
        approvedCapabilityKeys: [...(scope.approvedCapabilityKeys || [])].sort(),
        authenticationMode: scope.authenticationMode || null,
        policyRevision:
          trust?.workspacePolicy?.version || trust?.organizationPolicy?.version || null,
      }),
    )
    .digest('hex');
}

function trustDocumentDigest(document) {
  const { proof: _proof, ...payload } = document;
  return digest(payload);
}

function normalizeBaseUrl(value, policy = {}) {
  const url = new URL(value);
  const allowedLocalOrigins = new Set(
    (policy.allowedLocalOrigins || []).map((item) => new URL(item).origin.toLowerCase()),
  );
  const localFixture =
    policy.localFixtureMode === true &&
    /^(?:localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(url.hostname) &&
    allowedLocalOrigins.has(url.origin.toLowerCase());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localFixture)) {
    throw new TypeError('Ghost Bridge baseUrl requires HTTPS outside explicit local fixture mode.');
  }
  if (url.username || url.password) {
    throw new TypeError('Ghost Bridge baseUrl must not contain credentials.');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function resolveEndpoint(baseUrl, value) {
  if (!value) throw protocolError('INVALID_MESSAGE', 'Discovery omitted a required endpoint.');
  if (
    typeof value !== 'string' ||
    /[\u0000-\u001f\u007f\\]/.test(value) ||
    /%(?:2f|3a|40|5c)/i.test(value)
  ) {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an unsafe endpoint URL.');
  }
  const endpoint = new URL(value, `${baseUrl}/`);
  if (!['https:', 'http:'].includes(endpoint.protocol)) {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an invalid endpoint scheme.');
  }
  if (endpoint.origin !== new URL(baseUrl).origin) {
    throw protocolError('INVALID_MESSAGE', 'Discovery endpoint origin does not match the agent.');
  }
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an unsafe endpoint URL.');
  }
  return endpoint.toString();
}

function uniqueConnectionForAgent(connections, agentId) {
  const matches = [...connections.values()].filter((connection) => connection.agentId === agentId);
  if (matches.length !== 1) {
    throw createSdkError(
      'CONNECTION_NOT_ACTIVE',
      matches.length
        ? 'Connection ID is required when multiple scoped Connections target the same agent.'
        : 'Install the target agent before invoking a capability.',
    );
  }
  return matches[0];
}

function assertInvocationScope(connection, options) {
  for (const field of ['organizationScope', 'workspaceScope']) {
    if (options[field] !== undefined && options[field] !== connection[field]) {
      throw createSdkError(
        'SCOPE_MISMATCH',
        `Invocation ${field} must exactly match the stored Connection scope.`,
      );
    }
  }
}

function endpointWith(baseUrl, template, token, value) {
  let templateUrl;
  try {
    templateUrl = new URL(
      typeof template === 'string'
        ? template.replace(token, 'ghostbridge-template-token')
        : '',
      `${baseUrl}/`,
    );
  } catch {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an invalid endpoint template.');
  }
  if (
    typeof template !== 'string' ||
    template.split(token).length !== 2 ||
    !templateUrl.pathname.includes('ghostbridge-template-token')
  ) {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an invalid endpoint template.');
  }
  return resolveEndpoint(baseUrl, template.replace(token, encodeURIComponent(value)));
}

module.exports = {
  ApprovalRequiredError,
  AuthenticationError,
  AuthorizationError,
  CapabilityNotFoundError,
  CompatibilityError,
  ContractViolationError,
  DataContractViolationError,
  DeadlineExceededError,
  DelegationError,
  GhostBridgeError,
  GhostBridgeClient,
  InstallGrantError,
  PassportValidationError,
  ProtocolValidationError,
  ProviderUnavailableError,
  RateLimitedError,
  RevokedError,
  ScopeMismatchError,
  TaskCancelledError,
  TaskFailedError,
  UnsupportedProtocolVersionError,
  classifyRetry,
  createGhostBridgeClient,
  discover,
};
