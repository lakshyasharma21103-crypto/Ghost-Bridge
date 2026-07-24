'use strict';

const crypto = require('node:crypto');
const {
  ALLOWED_ALGORITHMS,
  KEY_PURPOSES,
  TRUST_PROFILE_VERSION,
  PROOF_PROFILE,
  assertKeyTransition,
  calculateJwkThumbprint,
  digest,
  normalizeIssuerId,
  signDocument,
  trustError,
  withoutProof,
} = require('@ghostbridge/trust');
const { PROTOCOL_VERSION, assertPlainData, redactPublicData } = require('@ghostbridge/protocol-core');

const MAX_AUDIT_EVENTS = 1_000;

class LocalTestKeyProvider {
  #records = new Map();

  constructor(options = {}) {
    this.mode = options.mode || 'test';
    this.clock = options.clock || Date.now;
    this.audit = typeof options.audit === 'function' ? options.audit : () => {};
    if (this.mode === 'production') {
      throw trustError('KEY_NOT_ACTIVE', 'The local synthetic key provider is prohibited in production mode.');
    }
  }

  createKey(options = {}) {
    const kid = String(options.kid || `test_${crypto.randomUUID()}`);
    if (!/^[A-Za-z0-9._~-]{1,128}$/.test(kid)) throw new TypeError('A bounded non-URL key identifier is required.');
    if (this.#records.has(kid)) throw trustError('JWKS_INVALID', 'Key identifiers cannot be reused.');
    const purposes = Object.freeze(
      [...new Set(Array.isArray(options.purpose) ? options.purpose : [options.purpose])].filter(Boolean),
    );
    if (!purposes.length || purposes.some((purpose) => !KEY_PURPOSES.includes(purpose))) {
      throw new TypeError('At least one supported key purpose is required.');
    }
    const pair = crypto.generateKeyPairSync('ed25519');
    const publicJwk = pair.publicKey.export({ format: 'jwk' });
    const now = this.clock();
    const notBefore = options.notBefore || new Date(now).toISOString();
    const expiresAt =
      options.expiresAt || new Date(now + (options.lifetimeMs || 31_536_000_000)).toISOString();
    const metadata = {
      ...publicJwk,
      kid,
      use: 'sig',
      alg: 'EdDSA',
      state: 'generated',
      notBefore,
      expiresAt,
      activationSequence: null,
      retirementSequence: null,
      thumbprint: calculateJwkThumbprint(publicJwk),
      purpose: purposes,
      testOnly: true,
    };
    this.#records.set(kid, {
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      metadata,
      materialFingerprint: metadata.thumbprint,
      destroyed: false,
    });
    this.#emit('trust.key.generated', { kid, purpose: purposes });
    return this.getPublicKey(kid);
  }

  getPublicKey(kid) {
    const record = this.#require(kid);
    return Object.freeze(structuredClone(record.metadata));
  }

  listPublicKeys(options = {}) {
    return Object.freeze(
      [...this.#records.values()]
        .filter((record) => !record.destroyed)
        .filter((record) => options.includeGenerated === true || record.metadata.state !== 'generated')
        .map((record) => Object.freeze(structuredClone(record.metadata))),
    );
  }

  sign(kid, data, context = {}) {
    const record = this.#require(kid);
    if (record.metadata.state !== 'active') {
      throw trustError(
        record.metadata.state === 'retired' ? 'KEY_RETIRED' : 'KEY_NOT_ACTIVE',
        'Only an active authorized key may create a new signature.',
      );
    }
    if (context.algorithm && context.algorithm !== record.metadata.alg) {
      throw trustError('KEY_TYPE_MISMATCH', 'The requested algorithm does not match the signing key.');
    }
    if (context.purpose && !record.metadata.purpose.includes(context.purpose)) {
      throw trustError('KEY_NOT_ACTIVE', 'The key is not authorized for the requested signing purpose.');
    }
    return crypto.sign(null, Buffer.from(data), record.privateKey);
  }

  signer(kid) {
    const key = this.getPublicKey(kid);
    return Object.freeze({
      kid,
      algorithm: key.alg,
      sign: (data, context) => this.sign(kid, data, context),
    });
  }

  getKeyState(kid) {
    return this.#require(kid).metadata.state;
  }

  transitionKeyState(kid, nextState, options = {}) {
    const record = this.#require(kid);
    assertKeyTransition(record.metadata.state, nextState);
    const previousState = record.metadata.state;
    record.metadata = {
      ...record.metadata,
      state: nextState,
      ...(nextState === 'active'
        ? { activationSequence: positiveSequence(options.sequence, 'activation') }
        : {}),
      ...(['retiring', 'retired'].includes(nextState)
        ? { retirementSequence: positiveSequence(options.sequence, 'retirement') }
        : {}),
      ...(nextState === 'compromised'
        ? { compromisedAt: options.at || new Date(this.clock()).toISOString() }
        : {}),
    };
    this.#emit(`trust.key.${nextState}`, {
      kid,
      previousState,
      state: nextState,
      sequence: options.sequence,
    });
    return this.getPublicKey(kid);
  }

  destroyTestKey(kid) {
    const record = this.#require(kid);
    record.privateKey = undefined;
    record.destroyed = true;
    this.#records.delete(kid);
    this.#emit('trust.key.test_destroyed', { kid });
    return true;
  }

  assertMaterialUnchanged(kid, publicJwk) {
    const record = this.#require(kid);
    if (calculateJwkThumbprint(publicJwk) !== record.materialFingerprint) {
      throw trustError('JWKS_INVALID', 'Key material cannot change under an existing key identifier.');
    }
    return true;
  }

  #require(kid) {
    const record = this.#records.get(kid);
    if (!record || record.destroyed) throw trustError('KEY_NOT_FOUND', 'The signing key was not found.');
    return record;
  }

  #emit(event, fields) {
    this.audit(event, redactPublicData(fields));
  }
}

class IssuerToolkit {
  constructor(options = {}) {
    if (!options.issuerId) throw new TypeError('issuerId is required.');
    this.localTestMode = options.localTestMode === true;
    this.issuerId = normalizeIssuerId(options.issuerId, {
      localTestMode: this.localTestMode,
      allowedLocalIssuers: options.allowedLocalIssuers,
    });
    this.displayName = String(options.displayName || this.issuerId).slice(0, 200);
    this.keyProvider = options.keyProvider;
    if (!this.keyProvider) throw new TypeError('A non-exporting key provider is required.');
    this.protocolVersion = options.protocolVersion || PROTOCOL_VERSION;
    this.clock = options.clock || Date.now;
    this.metadataSequence = options.metadataSequence || 1;
    this.revocationSequence = 0;
    this.lastRevocationSet = undefined;
    this.events = [];
  }

  async createIssuerMetadata(options = {}) {
    const rootKey = this.keyProvider.getPublicKey(options.rootKeyId);
    const now = this.clock();
    const metadata = {
      protocolVersion: this.protocolVersion,
      trustProfileVersion: TRUST_PROFILE_VERSION,
      metadataVersion: '0.1-draft',
      issuerId: this.issuerId,
      displayName: this.displayName,
      status: options.status || 'active',
      issuedAt: options.issuedAt || new Date(now).toISOString(),
      updatedAt: options.updatedAt || new Date(now).toISOString(),
      expiresAt: options.expiresAt || new Date(now + 3_600_000).toISOString(),
      supportedProtocolVersions: options.supportedProtocolVersions || [this.protocolVersion],
      supportedTrustProfiles: [TRUST_PROFILE_VERSION],
      supportedProofProfiles: [PROOF_PROFILE],
      supportedAlgorithms: options.supportedAlgorithms || [...ALLOWED_ALGORITHMS],
      jwksUri: options.jwksUri || `${this.issuerId}/.well-known/ghostbridge-jwks.json`,
      revocationSetUri:
        options.revocationSetUri || `${this.issuerId}/.well-known/ghostbridge-revocations.json`,
      securityPolicyUri: options.securityPolicyUri || `${this.issuerId}/security`,
      privacyPolicyUri: options.privacyPolicyUri || `${this.issuerId}/privacy`,
      termsUri: options.termsUri || `${this.issuerId}/terms`,
      documentationUri: options.documentationUri || `${this.issuerId}/docs`,
      rootKeyThumbprints: options.rootKeyThumbprints || [rootKey.thumbprint],
      operationalKeyPolicy: options.operationalKeyPolicy || {
        rotationOverlapSeconds: 3_600,
        automaticRotation: true,
      },
      agentKeyPolicy: options.agentKeyPolicy || {
        passportAuthorizationRequired: true,
      },
      metadataSequence: options.metadataSequence || this.metadataSequence,
      extensions: options.extensions || {},
    };
    const signed = await signDocument(metadata, this.keyProvider.signer(options.rootKeyId), {
      purpose: 'issuer_metadata',
    });
    this.#audit('trust.issuer.metadata_verified', {
      issuerId: this.issuerId,
      metadataSequence: signed.metadataSequence,
    });
    return signed;
  }

  publishJwks(options = {}) {
    const keys = this.keyProvider.listPublicKeys({ includeGenerated: options.includeGenerated === true });
    return Object.freeze({
      issuer: this.issuerId,
      metadataSequence: options.metadataSequence || this.metadataSequence,
      keys,
    });
  }

  async signPassport(passport, keyId) {
    requireObject(passport);
    if (passport.issuer !== this.issuerId) throw trustError('ISSUER_MISMATCH', 'The Agent Passport issuer is invalid.');
    const normalized = {
      ...passport,
      protocolVersion: passport.protocolVersion || this.protocolVersion,
      trustProfileVersion: TRUST_PROFILE_VERSION,
    };
    const result = await signDocument(normalized, this.keyProvider.signer(keyId), {
      purpose: 'passport_signing',
    });
    this.#audit('trust.passport.issued', {
      passportId: result.passportId,
      passportVersion: result.passportVersion,
      kid: keyId,
    });
    return result;
  }

  async createCapabilityManifest(input, contracts, keyId) {
    requireObject(input);
    if (!Array.isArray(contracts) || contracts.length === 0) {
      throw new TypeError('Capability Contracts are required.');
    }
    const capabilities = contracts
      .map((contract) => ({
        capabilityKey: contract.capabilityKey,
        capabilityVersion: contract.capabilityVersion,
        contractDigest: digest(contract),
      }))
      .sort((left, right) => left.capabilityKey.localeCompare(right.capabilityKey));
    const manifest = {
      protocolVersion: this.protocolVersion,
      trustProfileVersion: TRUST_PROFILE_VERSION,
      manifestVersion: input.manifestVersion || '1',
      agentId: input.agentId,
      passportId: input.passportId,
      passportVersion: input.passportVersion,
      capabilities,
      issuedAt: input.issuedAt || new Date(this.clock()).toISOString(),
      expiresAt: input.expiresAt,
      status: input.status || 'active',
      issuer: this.issuerId,
    };
    return signDocument(manifest, this.keyProvider.signer(keyId), {
      purpose: 'capability_signing',
    });
  }

  async signInstallResolution(resolution, keyId) {
    return this.#signScoped(resolution, keyId, 'install_resolution_signing');
  }

  async signConnectionOffer(offer, keyId) {
    return this.#signScoped(offer, keyId, 'connection_offer_signing');
  }

  async signRevocationSet(input, keyId) {
    const sequence = input.sequence || this.revocationSequence + 1;
    if (!Number.isSafeInteger(sequence) || sequence <= this.revocationSequence) {
      throw trustError('REVOCATION_ROLLBACK', 'Revocation-set sequences must increase monotonically.');
    }
    const payload = {
      protocolVersion: this.protocolVersion,
      trustProfileVersion: TRUST_PROFILE_VERSION,
      revocationSetId: input.revocationSetId || `revocations_${sequence}`,
      issuer: this.issuerId,
      sequence,
      generatedAt: input.generatedAt || new Date(this.clock()).toISOString(),
      nextUpdate: input.nextUpdate,
      status: input.status || 'active',
      previousSetDigest: this.lastRevocationSet
        ? digest(withoutProof(this.lastRevocationSet))
        : 'none',
      entries: structuredClone(input.entries || []),
      extensions: input.extensions || {},
    };
    const signed = await signDocument(payload, this.keyProvider.signer(keyId), {
      purpose: 'revocation_signing',
    });
    this.revocationSequence = sequence;
    this.lastRevocationSet = signed;
    this.#audit('trust.revocation_set.updated', { sequence, entryCount: payload.entries.length });
    return signed;
  }

  async signReceipt(receipt, keyId) {
    return this.#signScoped(receipt, keyId, 'execution_receipt_signing');
  }

  authorizeAgentExecutionKey(keyId, options = {}) {
    const key = this.keyProvider.getPublicKey(keyId);
    const purposes = options.purposes || key.purpose;
    const forbidden = purposes.filter((purpose) =>
      ['issuer_metadata', 'passport_signing', 'revocation_signing'].includes(purpose),
    );
    if (forbidden.length) {
      throw trustError('KEY_NOT_ACTIVE', 'Agent execution keys cannot receive issuer authority.');
    }
    return Object.freeze({
      kid: key.kid,
      thumbprint: key.thumbprint,
      purposes: Object.freeze([...purposes]),
      notBefore: options.notBefore || key.notBefore,
      expiresAt: options.expiresAt || key.expiresAt,
      status: options.status || 'active',
      ...(options.runtimeInstanceScope
        ? { runtimeInstanceScope: String(options.runtimeInstanceScope) }
        : {}),
    });
  }

  prepublishKey(kid, sequence) {
    const key = this.keyProvider.transitionKeyState(kid, 'prepublished', { sequence });
    this.metadataSequence = Math.max(this.metadataSequence + 1, sequence || 0);
    this.#audit('trust.key.prepublished', { kid, metadataSequence: this.metadataSequence });
    return key;
  }

  activateKey(kid, sequence) {
    const key = this.keyProvider.transitionKeyState(kid, 'active', { sequence });
    this.metadataSequence = Math.max(this.metadataSequence + 1, sequence || 0);
    this.#audit('trust.key.activated', { kid, metadataSequence: this.metadataSequence });
    return key;
  }

  beginRotation(oldKeyId, newKeyId, sequence) {
    if (this.keyProvider.getKeyState(newKeyId) !== 'prepublished') {
      throw trustError('KEY_NOT_ACTIVE', 'The replacement key must be prepublished before activation.');
    }
    const next = this.activateKey(newKeyId, sequence);
    const previous = this.keyProvider.transitionKeyState(oldKeyId, 'retiring', { sequence });
    this.#audit('trust.key.rotation_started', {
      oldKeyId,
      newKeyId,
      metadataSequence: this.metadataSequence,
    });
    return Object.freeze({ previous, next, metadataSequence: this.metadataSequence });
  }

  retireKey(kid, sequence) {
    const key = this.keyProvider.transitionKeyState(kid, 'retired', { sequence });
    this.metadataSequence = Math.max(this.metadataSequence + 1, sequence || 0);
    this.#audit('trust.key.retired', { kid, metadataSequence: this.metadataSequence });
    return key;
  }

  compromiseKey(kid, options = {}) {
    const key = this.keyProvider.transitionKeyState(kid, 'compromised', {
      at: options.at,
      sequence: options.sequence,
    });
    this.metadataSequence += 1;
    this.#audit('trust.key.compromised', { kid, at: key.compromisedAt });
    return key;
  }

  revokeKey(kid, options = {}) {
    const key = this.keyProvider.transitionKeyState(kid, 'revoked', options);
    this.metadataSequence += 1;
    this.#audit('trust.key.revoked', { kid });
    return key;
  }

  auditEvents() {
    return this.events.map((event) => structuredClone(event));
  }

  async #signScoped(document, keyId, purpose) {
    requireObject(document);
    if (document.issuer !== this.issuerId) throw trustError('ISSUER_MISMATCH', 'The signed object issuer is invalid.');
    if (!document.audience) throw trustError('AUDIENCE_MISMATCH', 'A scoped signed object requires an audience.');
    if (!document.issuedAt || !document.expiresAt || !document.messageId) {
      throw trustError('PROOF_INVALID', 'A scoped signed object requires issuance, expiry, and message identifiers.');
    }
    return signDocument(
      { ...document, trustProfileVersion: TRUST_PROFILE_VERSION },
      this.keyProvider.signer(keyId),
      { purpose },
    );
  }

  #audit(event, fields) {
    const record = Object.freeze({
      event,
      at: new Date(this.clock()).toISOString(),
      fields: redactPublicData(fields),
    });
    this.events.push(record);
    if (this.events.length > MAX_AUDIT_EVENTS) this.events.shift();
  }
}

function createLocalTestKeyProvider(options) {
  return new LocalTestKeyProvider(options);
}

function createIssuerToolkit(options) {
  return new IssuerToolkit(options);
}

async function createSyntheticIssuer(options = {}) {
  const events = [];
  const keyProvider = createLocalTestKeyProvider({
    mode: 'test',
    clock: options.clock,
    audit: (event, fields) => events.push({ event, fields }),
  });
  const toolkit = createIssuerToolkit({
    issuerId: options.issuerId || 'http://127.0.0.1:8787',
    displayName: options.displayName || 'Synthetic Ghost Bridge Issuer',
    localTestMode: true,
    allowedLocalIssuers: [options.issuerId || 'http://127.0.0.1:8787'],
    keyProvider,
    clock: options.clock,
  });
  const root = keyProvider.createKey({ kid: 'test_root_1', purpose: ['issuer_metadata', 'recovery'] });
  toolkit.prepublishKey(root.kid, 1);
  toolkit.activateKey(root.kid, 2);
  const operational = keyProvider.createKey({
    kid: 'test_operational_1',
    purpose: [
      'passport_signing',
      'capability_signing',
      'install_resolution_signing',
      'connection_offer_signing',
    ],
  });
  toolkit.prepublishKey(operational.kid, 3);
  toolkit.activateKey(operational.kid, 4);
  const revocation = keyProvider.createKey({ kid: 'test_revocation_1', purpose: ['revocation_signing'] });
  toolkit.prepublishKey(revocation.kid, 5);
  toolkit.activateKey(revocation.kid, 6);
  const execution = keyProvider.createKey({
    kid: 'test_execution_1',
    purpose: ['execution_receipt_signing', 'request_signing'],
  });
  toolkit.prepublishKey(execution.kid, 7);
  toolkit.activateKey(execution.kid, 8);
  return Object.freeze({
    toolkit,
    keyProvider,
    keyIds: Object.freeze({
      root: root.kid,
      operational: operational.kid,
      revocation: revocation.kid,
      execution: execution.kid,
    }),
    events,
  });
}

function requireObject(value) {
  assertPlainData(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('A plain DTO is required.');
}

function positiveSequence(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`A positive ${label} sequence is required.`);
  }
  return value;
}

module.exports = {
  IssuerToolkit,
  LocalTestKeyProvider,
  createIssuerToolkit,
  createLocalTestKeyProvider,
  createSyntheticIssuer,
};
