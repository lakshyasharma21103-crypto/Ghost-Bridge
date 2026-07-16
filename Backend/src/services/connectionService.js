const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const { env } = require('../config/env');
const { databaseStatus } = require('../config/db');
const { createAuditLog } = require('./auditService');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { hashKey, decryptPayload, encryptPayload } = require('../utils/crypto');
const safeFetchUtility = require('../utils/safeFetch');
const { recordCircuitFailure, recordCircuitSuccess } = require('./circuitBreaker.service');
const {
  currentHealth,
  recordConnectionFailure,
  recordConnectionSuccess,
} = require('./connectionHealth.service');
const { createObserver } = require('../utils/observability');
const { runtimeSupport } = require('./adapters');
const {
  actorFromRuntimeActor,
  assertAuthorized,
  resourceFromConnection,
} = require('./authorization.service');
const { governCredentialForConnection } = require('./secretGovernance.service');
const { resolveCredentialForRuntime } = require('./credentialBroker.service');

const INSTALL_KEY_PATTERN = /^agentpass_install_[A-Za-z0-9_-]{32,}$/;
const CREDENTIAL_TYPES = ['api_key', 'bearer_token'];
const HEADER_NAME_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const AUTH_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
    { path, message },
  ]);
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(path, `${path} is required.`);
  }
  return value.trim();
}

function requireReceivingIdentity(input) {
  return {
    receivingWorkspaceId: requireString(input?.receivingWorkspaceId, 'receivingWorkspaceId'),
    receivingUserId: requireString(input?.receivingUserId, 'receivingUserId'),
  };
}

function optionalValidDate(value, path) {
  if (value == null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(path, `${path} must be a valid ISO-8601 date.`);
  }
  return date;
}

function installKeyError(installKey) {
  if (!installKey) {
    return new AppError(
      404,
      ErrorCodes.INSTALL_KEY_INVALID,
      'Agent Passport Install Key is invalid.',
    );
  }
  if (installKey.status === 'used') {
    return new AppError(
      409,
      ErrorCodes.INSTALL_KEY_ALREADY_USED,
      'Agent Passport Install Key has already been used.',
    );
  }
  if (installKey.status === 'revoked') {
    return new AppError(
      409,
      ErrorCodes.INSTALL_KEY_REVOKED,
      'Agent Passport Install Key has been revoked.',
    );
  }
  if (installKey.status === 'expired' || new Date(installKey.expiresAt).getTime() <= Date.now()) {
    return new AppError(
      410,
      ErrorCodes.INSTALL_KEY_EXPIRED,
      'Agent Passport Install Key has expired.',
    );
  }
  return new AppError(
    409,
    ErrorCodes.INSTALL_KEY_INVALID,
    'Agent Passport Install Key is not active.',
  );
}

function serializeCapability(capability) {
  return {
    name: capability.name,
    description: capability.description,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    riskLevel: capability.riskLevel,
    classification: capability.classification || 'UNCLASSIFIED',
    category: capability.category || 'UNCLASSIFIED',
    sideEffect: capability.sideEffect || 'UNKNOWN',
    requiredPermission: capability.requiredPermission,
    retrySafety: capability.retrySafety,
    cancellationSupport: capability.cancellationSupport,
    idempotencySupport: capability.idempotencySupport,
  };
}

function createPassportSnapshot(passport, capabilities, installKey) {
  return {
    protocol: passport.protocol,
    agent: {
      id: passport.agent.id,
      name: passport.agent.name,
      provider: passport.agent.provider,
      description: passport.agent.description,
      version: passport.agent.version,
      ...(passport.agent.iconUrl ? { iconUrl: passport.agent.iconUrl } : {}),
    },
    auth: {
      type: passport.auth.type,
      scopes: passport.auth.scopes || [],
      ...(passport.auth.header ? { header: passport.auth.header } : {}),
      ...(passport.auth.scheme ? { scheme: passport.auth.scheme } : {}),
    },
    runtime: {
      type: passport.runtime.type,
      endpoint: passport.runtime.endpoint,
      method: passport.runtime.method,
      ...(passport.runtime.inputField ? { inputField: passport.runtime.inputField } : {}),
      ...(passport.runtime.outputField ? { outputField: passport.runtime.outputField } : {}),
      supportsStreaming: Boolean(passport.runtime.supportsStreaming),
      supportsLongRunningTasks: Boolean(passport.runtime.supportsLongRunningTasks),
    },
    health: passport.health?.endpoint ? { endpoint: passport.health.endpoint } : {},
    capabilities: capabilities.map(serializeCapability),
    installation: {
      installMode: installKey.installMode,
      scope: installKey.scope,
    },
  };
}

function safeConnectionView(connection, options = {}) {
  const snapshot = connection.resolvedPassportSnapshot || {};
  const installation = snapshot.installation || {};
  const authType = installation.credentialType || snapshot.auth?.type || 'unknown';
  const result = {
    connectionId: idOf(connection),
    status: connection.status,
    agent: {
      name: snapshot.agent?.name,
      provider: snapshot.agent?.provider,
      description: snapshot.agent?.description,
    },
    runtime: runtimeSupport(connection.runtimeType),
    auth: {
      type: authType,
      credentialConfigured: Boolean(connection.credentialId),
    },
    installScope: connection.installScope || installation.scope,
    lastHealthStatus: connection.lastHealthStatus || null,
    healthStatus: currentHealth(connection),
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };

  if (options.includeCapabilities) {
    result.capabilities = snapshot.capabilities || [];
  }

  return result;
}

async function auditKeyResolutionFailure(installKey, identity, identifiers, reason) {
  if (!installKey) return;
  await createAuditLog(
    'user',
    identity.receivingUserId,
    'install_key.resolve_denied',
    'PassportInstallKey',
    idOf(installKey),
    {
      keyPrefix: installKey.keyPrefix,
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      reason,
    },
    identifiers,
  );
}

async function markKeyExpired(installKey) {
  if (installKey.status !== 'active') return;
  await PassportInstallKey.updateOne(
    { _id: installKey._id, status: 'active' },
    { $set: { status: 'expired' } },
  );
}

async function resolveInstallKey(input, requestContext) {
  const context =
    typeof requestContext === 'string' ? { requestId: requestContext } : requestContext || {};
  const requestId = context.requestId;
  const auditIdentifiers = { requestId, traceId: context.traceId };
  const observer = context.observer || createObserver({ traceId: context.traceId, requestId });
  const { identity, keyHash, installKey } = await observer.stage(
    'install_key_resolution',
    async () => {
      const nextRawKey = requireString(input?.key, 'key');
      const nextIdentity = requireReceivingIdentity(input);
      if (!INSTALL_KEY_PATTERN.test(nextRawKey)) {
        throw new AppError(
          400,
          ErrorCodes.INSTALL_KEY_INVALID,
          'Agent Passport Install Key format is invalid.',
          [{ path: 'key', message: 'key must be an Agent Passport Install Key.' }],
        );
      }
      const nextKeyHash = hashKey(nextRawKey);
      const nextInstallKey = await PassportInstallKey.findOne({ keyHash: nextKeyHash });
      if (
        !nextInstallKey ||
        nextInstallKey.status !== 'active' ||
        new Date(nextInstallKey.expiresAt).getTime() <= Date.now()
      ) {
        if (nextInstallKey && new Date(nextInstallKey.expiresAt).getTime() <= Date.now()) {
          await markKeyExpired(nextInstallKey);
        }
        const error = installKeyError(nextInstallKey);
        await auditKeyResolutionFailure(nextInstallKey, nextIdentity, auditIdentifiers, error.code);
        throw error;
      }
      return {
        identity: nextIdentity,
        keyHash: nextKeyHash,
        installKey: nextInstallKey,
      };
    },
  );

  const [passport, capabilities] = await observer.stage('passport_retrieval', () =>
    Promise.all([
      AgentPassport.findOne({ _id: installKey.passportId }),
      Capability.find({ passportId: installKey.passportId }).sort({ name: 1 }).lean(),
    ]),
  );

  await observer.stage('passport_validation', async () => {
    if (!passport || passport.status !== 'valid') {
      const error = new AppError(
        409,
        ErrorCodes.PASSPORT_UNAVAILABLE,
        'Agent Passport is not available for installation.',
      );
      await auditKeyResolutionFailure(
        installKey,
        identity,
        auditIdentifiers,
        passport?.status || 'not_found',
      );
      throw error;
    }
    if (
      !passport.agent?.id ||
      !passport.runtime?.type ||
      !passport.auth?.type ||
      !passport.install
    ) {
      throw new AppError(
        409,
        ErrorCodes.PASSPORT_UNAVAILABLE,
        'Agent Passport metadata is incomplete.',
      );
    }
  });

  await observer.stage('capability_import', async () => {
    if (
      !capabilities.length ||
      capabilities.some((item) => !item.name || !item.inputSchema || !item.outputSchema)
    ) {
      throw new AppError(
        409,
        ErrorCodes.PASSPORT_UNAVAILABLE,
        'Agent Passport capability metadata is incomplete.',
      );
    }
  });

  await observer.stage('runtime_configuration_resolution', async () => {
    if (!passport.runtime?.endpoint || !passport.runtime?.method) {
      throw new AppError(
        409,
        ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
        'Agent runtime configuration is incomplete.',
      );
    }
  });

  const runtimeGrant = await observer.stage('delegated_credential_resolution', async () => {
    if (installKey.installMode !== 'delegated_runtime_access') return undefined;
    if (!installKey.encryptedRuntimeGrant) {
      throw new AppError(
        409,
        ErrorCodes.INSTALL_KEY_INVALID,
        'Delegated runtime access is unavailable for this install key.',
      );
    }
    if (
      installKey.runtimeGrantExpiresAt &&
      new Date(installKey.runtimeGrantExpiresAt).getTime() <= Date.now()
    ) {
      throw new AppError(
        409,
        ErrorCodes.RUNTIME_GRANT_EXPIRED,
        'Delegated runtime grant has expired.',
      );
    }
    try {
      return decryptPayload(installKey.encryptedRuntimeGrant);
    } catch {
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Delegated runtime access could not be prepared securely.',
      );
    }
  });

  const now = new Date();
  const consumedKey = await PassportInstallKey.findOneAndUpdate(
    {
      _id: installKey._id,
      keyHash,
      status: 'active',
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: 'used',
        usedAt: now,
        usedByWorkspaceId: identity.receivingWorkspaceId,
        usedByUserId: identity.receivingUserId,
      },
    },
    { new: true },
  );

  if (!consumedKey) {
    const currentKey = await PassportInstallKey.findOne({ keyHash });
    const error = installKeyError(currentKey);
    await auditKeyResolutionFailure(currentKey, identity, auditIdentifiers, error.code);
    throw error;
  }

  const connectionStatus =
    consumedKey.installMode === 'delegated_runtime_access'
      ? 'connected'
      : consumedKey.installMode === 'auth_required'
        ? 'pending_auth'
        : 'disconnected';
  const snapshot = createPassportSnapshot(passport, capabilities, consumedKey);
  snapshot.installation.credentialType =
    consumedKey.installMode === 'delegated_runtime_access' ? 'delegated_runtime_access' : undefined;

  const connection = await observer.stage('connection_creation', () =>
    PassportConnection.create({
      passportId: passport._id,
      partnerId: passport.partnerId,
      organizationId: passport.partnerId,
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      installScope: consumedKey.scope,
      status: connectionStatus,
      resolvedPassportSnapshot: snapshot,
      runtimeType: passport.runtime.type,
      runtimeEndpoint: passport.runtime.endpoint,
    }),
  );

  let credential;
  if (runtimeGrant) {
    credential = await Credential.create({
      connectionId: connection._id,
      partnerId: connection.partnerId,
      organizationId: connection.organizationId || connection.partnerId,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      type: 'delegated_runtime_access',
      encryptedPayload: encryptPayload(runtimeGrant),
      status: 'active',
      expiresAt: consumedKey.runtimeGrantExpiresAt,
    });
    connection.credentialId = credential._id;
    if (databaseStatus() === 'connected') {
      const governed = await governCredentialForConnection({
        connection,
        credential,
        payload: runtimeGrant,
        actorId: `user:${identity.receivingUserId}`,
      });
      connection.credentialBindingId = governed.binding._id;
    }
    await connection.save();
  }

  await observer.stage('connection_verification', async () => {
    const expectedStatus = runtimeGrant ? 'connected' : connectionStatus;
    if (connection.status !== expectedStatus || (runtimeGrant && !connection.credentialId)) {
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Connection could not be verified after installation.',
      );
    }
  });

  await createAuditLog(
    'user',
    identity.receivingUserId,
    'install_key.consumed',
    'PassportInstallKey',
    idOf(consumedKey),
    {
      keyPrefix: consumedKey.keyPrefix,
      passportId: idOf(passport),
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      installMode: consumedKey.installMode,
      scope: consumedKey.scope,
    },
    auditIdentifiers,
  );
  await createAuditLog(
    'user',
    identity.receivingUserId,
    'connection.created',
    'PassportConnection',
    idOf(connection),
    {
      passportId: idOf(passport),
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      status: connection.status,
      installMode: consumedKey.installMode,
      scope: consumedKey.scope,
    },
    auditIdentifiers,
  );
  if (credential) {
    await createAuditLog(
      'user',
      identity.receivingUserId,
      'credential.created',
      'Credential',
      idOf(credential),
      {
        connectionId: idOf(connection),
        receivingWorkspaceId: identity.receivingWorkspaceId,
        receivingUserId: identity.receivingUserId,
        type: credential.type,
        expiresAt: credential.expiresAt,
      },
      auditIdentifiers,
    );
  }

  return {
    ...safeConnectionView(connection, { includeCapabilities: true }),
    keyConsumed: true,
  };
}

async function findOwnedConnection(connectionId, input) {
  const identity = requireReceivingIdentity(input);
  const connection = await PassportConnection.findOne({
    _id: connectionId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  });
  if (!connection) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Passport connection was not found.');
  }
  return { connection, identity };
}

async function listReceivingConnections(input) {
  const identity = requireReceivingIdentity(input);
  const connections = await PassportConnection.find({
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    items: connections.map((connection) => safeConnectionView(connection)),
  };
}

async function getReceivingConnection(connectionId, input) {
  const { connection } = await findOwnedConnection(connectionId, input);
  return safeConnectionView(connection, { includeCapabilities: true });
}

function validateHeader(value, path, fallback) {
  const header = value == null || value === '' ? fallback : requireString(value, path);
  if (!HEADER_NAME_PATTERN.test(header)) {
    throw validationError(path, `${path} must be a valid HTTP header name.`);
  }
  return header;
}

function validateScheme(value, path, fallback) {
  const scheme = value == null || value === '' ? fallback : requireString(value, path);
  if (scheme && !AUTH_SCHEME_PATTERN.test(scheme)) {
    throw validationError(path, `${path} must be a valid authentication scheme.`);
  }
  return scheme;
}

function validateCredentialInput(body, passportAuth) {
  const type = body?.type;
  const credential = body?.credential;
  const issues = [];
  if (!CREDENTIAL_TYPES.includes(type)) {
    issues.push({ path: 'type', message: `type must be one of: ${CREDENTIAL_TYPES.join(', ')}.` });
  }
  if (!credential || typeof credential !== 'object' || Array.isArray(credential)) {
    issues.push({ path: 'credential', message: 'credential must be an object.' });
  }
  if (issues.length) {
    throw new AppError(
      400,
      ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
      'Credential validation failed.',
      issues,
    );
  }

  const expiresAt = optionalValidDate(credential.expiresAt, 'credential.expiresAt');
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw validationError('credential.expiresAt', 'credential.expiresAt must be in the future.');
  }

  if (type === 'api_key') {
    const apiKey = requireString(credential.apiKey, 'credential.apiKey');
    return {
      type,
      expiresAt,
      payload: {
        apiKey,
        header: validateHeader(
          credential.header,
          'credential.header',
          passportAuth?.header || 'X-API-Key',
        ),
        scheme: validateScheme(credential.scheme, 'credential.scheme', passportAuth?.scheme),
      },
    };
  }

  const accessToken = requireString(
    credential.accessToken || credential.token,
    'credential.accessToken',
  );
  return {
    type,
    expiresAt,
    payload: {
      accessToken,
      header: validateHeader(
        credential.header,
        'credential.header',
        passportAuth?.header || 'Authorization',
      ),
      scheme: validateScheme(
        credential.scheme,
        'credential.scheme',
        passportAuth?.scheme || 'Bearer',
      ),
    },
  };
}

async function storeConnectionCredential(connectionId, body, requestId) {
  const { connection, identity } = await findOwnedConnection(connectionId, body);
  const snapshot = connection.resolvedPassportSnapshot || {};
  await assertAuthorized(
    actorFromRuntimeActor(
      {
        actorType: 'user',
        actorId: identity.receivingUserId,
        receivingWorkspaceId: identity.receivingWorkspaceId,
        receivingUserId: identity.receivingUserId,
      },
      connection,
    ),
    'credential.rotate',
    resourceFromConnection(connection),
    {
      requestId,
      allowLegacyOwner: true,
      trustedConnection: connection,
      trustedPassport: { ...snapshot, _id: connection.passportId },
    },
  );
  const validated = validateCredentialInput(body, snapshot.auth);
  const credential = await Credential.create({
    connectionId: connection._id,
    partnerId: connection.partnerId,
    organizationId: connection.organizationId || connection.partnerId,
    receivingWorkspaceId: connection.receivingWorkspaceId,
    type: validated.type,
    encryptedPayload: encryptPayload(validated.payload),
    status: 'active',
    expiresAt: validated.expiresAt,
  });

  let governed;
  if (databaseStatus() === 'connected') {
    governed = await governCredentialForConnection({
      connection,
      credential,
      payload: validated.payload,
      actorId: `user:${identity.receivingUserId}`,
    });
  }

  connection.credentialId = credential._id;
  if (governed) connection.credentialBindingId = governed.binding._id;
  connection.status = 'connected';
  connection.resolvedPassportSnapshot = {
    ...snapshot,
    installation: {
      ...(snapshot.installation || {}),
      credentialType: validated.type,
    },
  };
  await connection.save();

  await createAuditLog(
    'user',
    identity.receivingUserId,
    'credential.created',
    'Credential',
    idOf(credential),
    {
      connectionId: idOf(connection),
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      type: credential.type,
      expiresAt: credential.expiresAt,
    },
    requestId,
  );
  await createAuditLog(
    'user',
    identity.receivingUserId,
    'connection.connected',
    'PassportConnection',
    idOf(connection),
    {
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
      credentialType: credential.type,
    },
    requestId,
  );

  return safeConnectionView(connection, { includeCapabilities: true });
}

function credentialHeader(header, value, scheme) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(
      409,
      ErrorCodes.CREDENTIAL_REQUIRED,
      'The active runtime credential is incomplete.',
    );
  }
  if (!HEADER_NAME_PATTERN.test(header || 'Authorization')) {
    throw new AppError(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Stored credential header could not be prepared securely.',
    );
  }
  if (scheme && !AUTH_SCHEME_PATTERN.test(scheme)) {
    throw new AppError(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Stored credential scheme could not be prepared securely.',
    );
  }
  return {
    [header || 'Authorization']: scheme ? `${scheme} ${value}` : value,
  };
}

async function credentialHeadersForConnection(connection, passportAuth, options = {}) {
  const runStage = (name, operation) =>
    options.observer ? options.observer.stage(name, operation) : operation();
  const auth = passportAuth || connection.resolvedPassportSnapshot?.auth || {};
  const credentialRequired = auth.type && auth.type !== 'no_auth_dev';
  const credential = await runStage('credential_load', async () => {
    if (!connection.credentialId) {
      if (credentialRequired && !options.allowMissing) {
        throw new AppError(
          409,
          ErrorCodes.CREDENTIAL_REQUIRED,
          'A runtime credential is required before this connection can be invoked.',
        );
      }
      return null;
    }
    const stored = await Credential.findOne({
      _id: connection.credentialId,
      connectionId: connection._id,
      status: 'active',
    }).lean();
    if (!stored) {
      throw new AppError(
        409,
        ErrorCodes.CREDENTIAL_REQUIRED,
        'The active runtime credential for this connection is unavailable.',
      );
    }
    if (stored.expiresAt && new Date(stored.expiresAt).getTime() <= Date.now()) {
      throw new AppError(409, ErrorCodes.CREDENTIAL_EXPIRED, 'The runtime credential has expired.');
    }
    return stored;
  });

  return runStage('credential_decryption', async () => {
    if (!credential) return {};
    let payload;
    try {
      payload = decryptPayload(credential.encryptedPayload);
    } catch {
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Stored credential could not be prepared securely.',
      );
    }
    if (credential.type === 'delegated_runtime_access') {
      return credentialHeader(
        payload.header || auth.header || 'Authorization',
        payload.accessToken || payload.token,
        payload.scheme || auth.scheme || 'Bearer',
      );
    }
    if (credential.type === 'api_key') {
      return credentialHeader(
        payload.header || auth.header || 'X-API-Key',
        payload.apiKey,
        payload.scheme || auth.scheme,
      );
    }
    if (credential.type === 'bearer_token') {
      return credentialHeader(
        payload.header || auth.header || 'Authorization',
        payload.accessToken,
        payload.scheme || auth.scheme || 'Bearer',
      );
    }
    throw new AppError(
      409,
      ErrorCodes.CREDENTIAL_REQUIRED,
      'The stored credential type is not supported for runtime invocation.',
    );
  });
}

function healthTarget(connection) {
  const snapshot = connection.resolvedPassportSnapshot || {};
  if (snapshot.health?.endpoint) {
    return { url: snapshot.health.endpoint, method: 'GET', source: 'health_endpoint' };
  }
  if (connection.runtimeType === 'mcp') {
    throw new AppError(
      501,
      ErrorCodes.ADAPTER_NOT_IMPLEMENTED,
      'MCP health checks require a declared HTTP health endpoint in v1.',
    );
  }
  return { url: connection.runtimeEndpoint, method: 'OPTIONS', source: 'runtime_endpoint' };
}

async function checkConnectionHealth(connectionId, body, requestId) {
  const { connection, identity } = await findOwnedConnection(connectionId, body);
  const snapshot = connection.resolvedPassportSnapshot || {};
  await assertAuthorized(
    actorFromRuntimeActor(
      {
        actorType: 'user',
        actorId: identity.receivingUserId,
        receivingWorkspaceId: identity.receivingWorkspaceId,
        receivingUserId: identity.receivingUserId,
      },
      connection,
    ),
    'connection.read',
    resourceFromConnection(connection),
    {
      requestId,
      allowLegacyOwner: true,
      trustedConnection: connection,
      trustedPassport: { ...snapshot, _id: connection.passportId },
    },
  );
  const target = healthTarget(connection);
  const brokered = await resolveCredentialForRuntime({
    organizationId: idOf(connection.organizationId || connection.partnerId),
    workspaceId: connection.receivingWorkspaceId,
    connectionId: idOf(connection),
    adapterId: connection.runtimeType,
    purpose: 'connection_health_check',
    environment: env.NODE_ENV,
    actorType: 'user',
    actorId: identity.receivingUserId,
    requestId,
    allowMissing: true,
    trustedConnection: connection,
    passportAuth: snapshot.auth,
  });
  const headers = brokered.credentialHeaders;
  const checkedAt = new Date();

  try {
    const remoteResponse = await safeFetchUtility.safeFetch(target.url, {
      method: target.method,
      headers,
      timeoutMs: env.RUNTIME_REQUEST_TIMEOUT_MS,
      allowDevelopmentDemo: true,
      allowDevelopmentExternalAgent: true,
    });
    let healthResult;
    if (remoteResponse.ok) {
      healthResult = await recordConnectionSuccess(connection, { now: checkedAt });
      await recordCircuitSuccess(connection, 'runtime', { now: checkedAt });
      if (healthResult.to === 'unknown' && typeof connection.save === 'function') {
        connection.healthStatus = 'healthy';
        connection.lastHealthStatus = 'healthy';
        connection.lastHealthCheckedAt = checkedAt;
        connection.lastHealthSuccessAt = checkedAt;
        connection.consecutiveHealthFailureCount = 0;
        await connection.save();
        healthResult = { changed: true, from: 'unknown', to: 'healthy' };
      }
    } else {
      const metadata = {
        code: 'RUNTIME_READINESS_FAILED',
        providerHttpStatus: remoteResponse.status,
        stage: 'connection_health_check',
      };
      healthResult = await recordConnectionFailure(connection, metadata, {
        now: checkedAt,
        activeCheck: true,
      });
      await recordCircuitFailure(connection, 'runtime', metadata, { now: checkedAt });
    }
    const healthStatus = healthResult.to || currentHealth(connection);
    await createAuditLog(
      'user',
      identity.receivingUserId,
      'connection.health_checked',
      'PassportConnection',
      idOf(connection),
      {
        receivingWorkspaceId: identity.receivingWorkspaceId,
        receivingUserId: identity.receivingUserId,
        source: target.source,
        remoteStatus: remoteResponse.status,
        result: healthStatus,
      },
      requestId,
    );
    if (healthResult.changed) {
      await createAuditLog(
        'user',
        identity.receivingUserId,
        'connection.health_changed',
        'PassportConnection',
        idOf(connection),
        {
          receivingWorkspaceId: identity.receivingWorkspaceId,
          receivingUserId: identity.receivingUserId,
          fromState: healthResult.from,
          toState: healthResult.to,
          reasonCode: remoteResponse.ok ? 'ACTIVE_CHECK_SUCCEEDED' : 'ACTIVE_CHECK_FAILED',
        },
        requestId,
      );
    }

    return {
      connectionId: idOf(connection),
      status: connection.status,
      health: {
        healthy: healthStatus === 'healthy',
        status: healthStatus,
        remoteStatus: remoteResponse.status,
        checkedAt,
      },
    };
  } catch (error) {
    const metadata = {
      code: error.code || ErrorCodes.SAFE_FETCH_FAILED,
      providerHttpStatus: error.providerHttpStatus,
      stage: 'connection_health_check',
    };
    const healthResult = await recordConnectionFailure(connection, metadata, {
      now: checkedAt,
      activeCheck: true,
    });
    await recordCircuitFailure(connection, 'runtime', metadata, { now: checkedAt });
    await createAuditLog(
      'user',
      identity.receivingUserId,
      'connection.health_checked',
      'PassportConnection',
      idOf(connection),
      {
        receivingWorkspaceId: identity.receivingWorkspaceId,
        receivingUserId: identity.receivingUserId,
        source: target.source,
        result: healthResult.to || currentHealth(connection),
        errorCode: error.code || ErrorCodes.SAFE_FETCH_FAILED,
      },
      requestId,
    );
    if (healthResult.changed) {
      await createAuditLog(
        'user',
        identity.receivingUserId,
        'connection.health_changed',
        'PassportConnection',
        idOf(connection),
        {
          receivingWorkspaceId: identity.receivingWorkspaceId,
          receivingUserId: identity.receivingUserId,
          fromState: healthResult.from,
          toState: healthResult.to,
          reasonCode: 'ACTIVE_CHECK_FAILED',
        },
        requestId,
      );
    }
    throw error;
  } finally {
    await brokered.release();
  }
}

module.exports = {
  resolveInstallKey,
  listReceivingConnections,
  getReceivingConnection,
  storeConnectionCredential,
  checkConnectionHealth,
  credentialHeadersForConnection,
  createPassportSnapshot,
  safeConnectionView,
};
