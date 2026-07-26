const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CredentialBinding = require('../models/CredentialBinding');
const CredentialLease = require('../models/CredentialLease');
const CredentialRotationAttempt = require('../models/CredentialRotationAttempt');
const EncryptionRewrapJob = require('../models/EncryptionRewrapJob');
const GovernedSecret = require('../models/GovernedSecret');
const SecretVersion = require('../models/SecretVersion');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const {
  consumeLease,
  validateCredentialStateForConnection,
} = require('../services/credentialBroker.service');
const {
  credentialHeaders,
  normalizeCredentialPayload,
  parseCredentialPayload,
  serializeCredentialPayload,
} = require('../services/credentialPayload.service');
const {
  authenticatedData,
  currentKeyVersion,
  decryptSecret,
  encryptSecret,
  fingerprintSecret,
  healthMetadata,
} = require('../services/encryptionKeyProvider.service');
const {
  serializeBinding,
  serializeSecret,
  serializeVersion,
} = require('../services/secretGovernance.service');
const secretMetrics = require('../services/secretMetrics.service');
const {
  ROTATION_STAGES,
  SECRET_STATUSES,
  SECRET_VERSION_STATUSES,
} = require('../constants/secretGovernance');
const { listPermissions } = require('../constants/permissionRegistry');
const { redactSecrets, redactString } = require('../utils/redact');
const { isRetryableError } = require('../utils/retryability');

const context = Object.freeze({
  organizationId: 'org_test',
  workspaceId: 'workspace_test',
  secretId: 'sec_test',
  versionId: 'sver_test',
  credentialType: 'api_key',
  schemaVersion: 1,
});

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function patch(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  return () => {
    object[key] = original;
  };
}

function query(value) {
  return { lean: async () => value };
}

test('new secret encryption persists ciphertext without plaintext', () => {
  const plaintext = Buffer.from('phase-13c3-sensitive-api-key');
  const encrypted = encryptSecret({ plaintext, context });
  assert.equal(JSON.stringify(encrypted).includes(plaintext.toString()), false);
  assert.equal(
    decryptSecret({ encryptedPayload: encrypted, context }).toString(),
    plaintext.toString(),
  );
  plaintext.fill(0);
});

test('each encryption uses a unique GCM IV', () => {
  const first = encryptSecret({ plaintext: 'same-value', context });
  const second = encryptSecret({ plaintext: 'same-value', context });
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

test('authenticated tenant metadata cannot be modified', () => {
  const encrypted = encryptSecret({ plaintext: 'tenant-bound', context });
  assert.throws(() =>
    decryptSecret({
      encryptedPayload: encrypted,
      context: { ...context, organizationId: 'org_2' },
    }),
  );
  assert.throws(() =>
    decryptSecret({
      encryptedPayload: encrypted,
      context: { ...context, workspaceId: 'workspace_2' },
    }),
  );
});

test('authenticated secret, version, type, and schema metadata cannot be modified', () => {
  const encrypted = encryptSecret({ plaintext: 'identity-bound', context });
  for (const changed of [
    { secretId: 'sec_other' },
    { versionId: 'sver_other' },
    { credentialType: 'bearer_token' },
    { schemaVersion: 2 },
  ]) {
    assert.throws(() =>
      decryptSecret({ encryptedPayload: encrypted, context: { ...context, ...changed } }),
    );
  }
});

test('tampered ciphertext and authentication tags fail closed', () => {
  const encrypted = encryptSecret({ plaintext: 'integrity-bound', context });
  assert.throws(() =>
    decryptSecret({
      encryptedPayload: { ...encrypted, tag: Buffer.alloc(16).toString('base64') },
      context,
    }),
  );
  assert.throws(() =>
    decryptSecret({ encryptedPayload: { ...encrypted, ciphertext: 'AAAA' }, context }),
  );
});

test('encryption records current key version and health exposes no material', () => {
  const encrypted = encryptSecret({ plaintext: 'versioned', context });
  assert.equal(encrypted.keyVersion, currentKeyVersion());
  const health = healthMetadata();
  assert.ok(health.availableKeyVersions.includes(encrypted.keyVersion));
  assert.equal(/keyMaterial|credentialEncryptionKey/i.test(JSON.stringify(health)), false);
});

test('AAD is deterministic and rejects incomplete identity', () => {
  assert.deepEqual(authenticatedData(context), authenticatedData(context));
  assert.throws(() => authenticatedData({ ...context, secretId: '' }));
});

test('safe fingerprints are keyed, short, deterministic, and context scoped', () => {
  const first = fingerprintSecret({ plaintext: 'fingerprint-me', context });
  const second = fingerprintSecret({ plaintext: 'fingerprint-me', context });
  const other = fingerprintSecret({
    plaintext: 'fingerprint-me',
    context: { ...context, secretId: 'sec_other' },
  });
  assert.deepEqual(first, second);
  assert.notEqual(first.digest, other.digest);
  assert.match(first.display, /^fp_[a-f0-9]{12}$/);
  assert.equal(first.display.includes('fingerprint-me'), false);
});

test('credential payload normalization validates types and stores buffer data transiently', () => {
  const payload = normalizeCredentialPayload('api_key', 'one-time-value');
  assert.deepEqual(payload, { apiKey: 'one-time-value', header: 'X-API-Key', scheme: undefined });
  const buffer = serializeCredentialPayload(payload);
  assert.deepEqual(parseCredentialPayload(buffer), {
    apiKey: 'one-time-value',
    header: 'X-API-Key',
  });
  buffer.fill(0);
  assert.throws(() => normalizeCredentialPayload('unsupported', 'value'));
});

test('OAuth refresh token remains encrypted payload data and only access token is injected', () => {
  const payload = normalizeCredentialPayload('oauth2', {
    accessToken: 'access-only-at-dispatch',
    refreshToken: 'never-injected-refresh-token',
  });
  const headers = credentialHeaders('oauth2', payload);
  assert.equal(headers.Authorization, 'Bearer access-only-at-dispatch');
  assert.equal(JSON.stringify(headers).includes('never-injected-refresh-token'), false);
});

test('metadata serializers omit ciphertext, digest, nonce, tags, and plaintext', () => {
  const secret = serializeSecret({
    secretId: 'sec_1',
    organizationId: 'org_1',
    status: 'ACTIVE',
    encryptedPayload: { ciphertext: 'secret' },
  });
  const version = serializeVersion({
    secretId: 'sec_1',
    versionId: 'sver_1',
    status: 'ACTIVE',
    encryptedPayload: { ciphertext: 'secret' },
    fingerprintDigest: 'private-digest',
    safeFingerprint: 'fp_123456789abc',
  });
  const binding = serializeBinding({ bindingId: 'bind_1', connectionId: 'connection_1' });
  const combined = JSON.stringify({ secret, version, binding });
  assert.equal(combined.includes('ciphertext'), false);
  assert.equal(combined.includes('private-digest'), false);
  assert.equal(version.safeFingerprint, 'fp_123456789abc');
});

test('secret schemas contain tenant, lifecycle, version, expiry, and revision indexes', () => {
  const secretIndexes = GovernedSecret.schema
    .indexes()
    .map(([fields]) => Object.keys(fields).join(','));
  const versionIndexes = SecretVersion.schema
    .indexes()
    .map(([fields]) => Object.keys(fields).join(','));
  assert.ok(
    secretIndexes.some((index) => index.includes('organizationId') && index.includes('status')),
  );
  assert.ok(
    versionIndexes.some((index) => index.includes('secretId') && index.includes('version')),
  );
  assert.ok(versionIndexes.some((index) => index.includes('encryptionKeyVersion')));
  assert.equal(SecretVersion.schema.path('encryptedPayload').options.select, false);
});

test('binding schema is connection scoped and contains no credential value fields', () => {
  assert.ok(CredentialBinding.schema.path('organizationId'));
  assert.ok(CredentialBinding.schema.path('connectionId'));
  assert.ok(CredentialBinding.schema.path('allowedAdapter'));
  assert.equal(CredentialBinding.schema.path('credential'), undefined);
  assert.equal(CredentialBinding.schema.path('encryptedPayload'), undefined);
});

test('lease schema stores safe scope only and purges after evidence retention', () => {
  assert.ok(CredentialLease.schema.path('leaseId'));
  assert.ok(CredentialLease.schema.path('invocationId'));
  assert.equal(CredentialLease.schema.path('plaintext'), undefined);
  assert.equal(CredentialLease.schema.path('credentialHeaders'), undefined);
  assert.ok(
    CredentialLease.schema
      .indexes()
      .some(([fields, options]) => fields.purgeAt === 1 && options.expireAfterSeconds === 0),
  );
});

test('lease tenant mismatch is rejected before storage access', async () => {
  await assert.rejects(
    consumeLease(
      {
        organizationId: 'org_1',
        workspaceId: 'workspace_1',
        expiresAt: new Date(Date.now() + 60_000),
      },
      { organizationId: 'org_2', workspaceId: 'workspace_1' },
    ),
    { code: 'CREDENTIAL_LEASE_REVOKED' },
  );
});

test('one-use lease cannot be consumed when atomic claim is absent', async () => {
  const restore = patch(CredentialLease, 'findOneAndUpdate', async () => null);
  try {
    await assert.rejects(
      consumeLease(
        {
          _id: 'lease_object',
          leaseId: 'lease_1',
          organizationId: 'org_1',
          workspaceId: 'workspace_1',
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          organizationId: 'org_1',
          workspaceId: 'workspace_1',
          connectionId: 'connection_1',
          adapterId: 'rest',
          purpose: 'runtime_invocation',
        },
      ),
      { code: 'CREDENTIAL_LEASE_REVOKED' },
    );
  } finally {
    restore();
  }
});

test('credential metadata validation denies cross-tenant connections before lookup', async () => {
  await assert.rejects(
    validateCredentialStateForConnection({
      organizationId: 'org_other',
      workspaceId: 'workspace_1',
      connectionId: 'connection_1',
      trustedConnection: {
        _id: 'connection_1',
        partnerId: 'org_1',
        receivingWorkspaceId: 'workspace_1',
        status: 'connected',
      },
    }),
    { code: 'SECRET_ACCESS_DENIED' },
  );
});

test('revoked binding blocks current retry and recovery metadata validation', async () => {
  const restore = patch(CredentialBinding, 'findOne', () => query({ status: 'REVOKED' }));
  try {
    await assert.rejects(
      validateCredentialStateForConnection({
        organizationId: 'org_1',
        workspaceId: 'workspace_1',
        connectionId: 'connection_1',
        expectedCredentialBindingId: 'binding_object',
        trustedConnection: {
          _id: 'connection_1',
          partnerId: 'org_1',
          receivingWorkspaceId: 'workspace_1',
          credentialBindingId: 'binding_object',
          status: 'connected',
        },
      }),
      { code: 'SECRET_BINDING_REVOKED' },
    );
  } finally {
    restore();
  }
});

test('expired logical secret blocks broker metadata validation', async () => {
  const restores = [
    patch(CredentialBinding, 'findOne', () =>
      query({ status: 'ACTIVE', secretId: 'sec_1', allowedAdapter: 'rest' }),
    ),
    patch(GovernedSecret, 'findOne', () =>
      query({ status: 'EXPIRED', secretId: 'sec_1', organizationId: 'org_1' }),
    ),
  ];
  try {
    await assert.rejects(
      validateCredentialStateForConnection({
        organizationId: 'org_1',
        workspaceId: 'workspace_1',
        connectionId: 'connection_1',
        adapterId: 'rest',
        trustedConnection: {
          _id: 'connection_1',
          partnerId: 'org_1',
          receivingWorkspaceId: 'workspace_1',
          credentialBindingId: 'binding_1',
          status: 'connected',
        },
      }),
      { code: 'SECRET_EXPIRED' },
    );
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
});

test('active binding, secret, and version pass metadata-only revalidation', async () => {
  const restores = [
    patch(CredentialBinding, 'findOne', () =>
      query({
        bindingId: 'bind_1',
        status: 'ACTIVE',
        secretId: 'sec_1',
        allowedAdapter: 'rest',
      }),
    ),
    patch(GovernedSecret, 'findOne', () =>
      query({
        status: 'ACTIVE',
        secretId: 'sec_1',
        activeVersionId: 'sver_1',
        organizationId: 'org_1',
      }),
    ),
    patch(SecretVersion, 'findOne', () => query({ status: 'ACTIVE', versionId: 'sver_1' })),
  ];
  try {
    const result = await validateCredentialStateForConnection({
      organizationId: 'org_1',
      workspaceId: 'workspace_1',
      connectionId: 'connection_1',
      adapterId: 'rest',
      trustedConnection: {
        _id: 'connection_1',
        partnerId: 'org_1',
        receivingWorkspaceId: 'workspace_1',
        credentialBindingId: 'binding_1',
        status: 'connected',
      },
    });
    assert.deepEqual(result, {
      credentialRequired: true,
      legacy: false,
      bindingId: 'bind_1',
      secretId: 'sec_1',
      secretVersionId: 'sver_1',
    });
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
});

test('durable work records binding and safe requirements but no credential material', () => {
  assert.ok(RuntimeWorkItem.schema.path('credentialBindingId'));
  assert.ok(RuntimeWorkItem.schema.path('credentialRequirement.adapterId'));
  for (const forbidden of [
    'credential',
    'secretValue',
    'credentialHeaders',
    'refreshToken',
    'apiKey',
  ]) {
    assert.equal(RuntimeWorkItem.schema.path(forbidden), undefined);
  }
});

test('rotation and rewrap persistence have deterministic state and idempotency fields', () => {
  assert.deepEqual(ROTATION_STAGES.slice(0, 3), ['REQUESTED', 'NEW_VERSION_STORED', 'VALIDATING']);
  assert.ok(ROTATION_STAGES.includes('RECOVERY_REQUIRED'));
  assert.ok(CredentialRotationAttempt.schema.path('idempotencyKeyHash'));
  assert.ok(EncryptionRewrapJob.schema.path('lastProcessedVersionId'));
  assert.ok(EncryptionRewrapJob.schema.path('targetKeyVersion'));
});

test('rotation grace maintenance retires previous versions and completes attempts', () => {
  const maintenance = source('services/secretLifecycleMaintenance.service.js');
  assert.match(maintenance, /gracePeriodEndsAt: \{ \$lte: now \}/);
  assert.match(maintenance, /status: 'RETIRED'/);
  assert.match(maintenance, /stage: 'OLD_VERSION_RETIRED'/);
  assert.match(maintenance, /stage: 'COMPLETED'/);
});

test('completed encryption rewrap jobs replay idempotently without touching ciphertext', () => {
  const governance = source('services/secretGovernance.service.js');
  assert.match(governance, /if \(job\.status === 'COMPLETED'\)/);
  assert.match(governance, /idempotent: true/);
  assert.match(governance, /encryptionKeyVersion: \{ \$ne: targetKeyVersion \}/);
});

test('lifecycle state registries include grace, revocation, expiry, and destruction', () => {
  assert.ok(SECRET_STATUSES.includes('DISABLED'));
  assert.ok(SECRET_STATUSES.includes('REVOKED'));
  assert.ok(SECRET_VERSION_STATUSES.includes('PREVIOUS'));
  assert.ok(SECRET_VERSION_STATUSES.includes('EXPIRED'));
  assert.ok(SECRET_VERSION_STATUSES.includes('DESTROYED'));
});

test('nested objects, arrays, headers, cookies, and token fields are redacted', () => {
  const value = redactSecrets({
    items: [{ authorization: 'Bearer private-token-value' }, { refreshToken: 'refresh-private' }],
    headers: { cookie: 'session=private-cookie' },
  });
  const rendered = JSON.stringify(value);
  for (const forbidden of ['private-token-value', 'refresh-private', 'private-cookie']) {
    assert.equal(rendered.includes(forbidden), false);
  }
});

test('common provider keys, private keys, and signed URLs are redacted from strings', () => {
  const rendered = redactString(
    'sk-proj-abcdefghijklmnopqrstuvwxyz123456 -----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY----- https://x.test/a?x-amz-signature=signed-private',
  );
  assert.equal(rendered.includes('sk-proj-'), false);
  assert.equal(rendered.includes('BEGIN PRIVATE KEY'), false);
  assert.equal(rendered.includes('signed-private'), false);
});

test('secret metrics drop tenant and high-cardinality identifiers from labels', () => {
  secretMetrics.reset();
  secretMetrics.increment('credential_resolution', {
    outcome: 'denied',
    organizationId: 'org_sensitive',
    secretId: 'sec_sensitive',
    traceId: 'trace_sensitive',
  });
  const rendered = JSON.stringify(secretMetrics.snapshot());
  assert.equal(rendered.includes('org_sensitive'), false);
  assert.equal(rendered.includes('sec_sensitive'), false);
  assert.equal(rendered.includes('trace_sensitive'), false);
  assert.match(rendered, /outcome=denied/);
});

test('permanent credential failures are not retried and explicit transient provider failures are', () => {
  for (const code of [
    'SECRET_REVOKED',
    'SECRET_EXPIRED',
    'SECRET_BINDING_REVOKED',
    'SECRET_INTEGRITY_FAILED',
    'ENCRYPTION_KEY_UNAVAILABLE',
  ]) {
    assert.equal(isRetryableError({ code, statusCode: 503 }), false, code);
  }
  assert.equal(isRetryableError({ code: 'KMS_TEMPORARILY_UNAVAILABLE', retryable: true }), true);
});

test('permission registry exposes metadata-only and administrative secret bundles', () => {
  const permissions = new Map(listPermissions().map((permission) => [permission.id, permission]));
  for (const id of [
    'secret.metadata.read',
    'secret.create',
    'secret.update',
    'secret.rotate',
    'secret.revoke',
    'secret.destroy',
    'secret.binding.read',
    'secret.binding.manage',
    'secret.health.read',
    'secret.health.check',
    'secret.audit.read',
    'encryption-key.metadata.read',
    'encryption-key.rotate',
  ]) {
    assert.ok(permissions.has(id), id);
    assert.ok(permissions.get(id).auditRequired);
  }
});

test('public secret routes do not include plaintext, reveal, export, or lease redemption', () => {
  const routes = source('routes/secretRoutes.js');
  assert.equal(/\/plaintext|\/reveal|\/export|\/redeem/i.test(routes), false);
  assert.match(routes, /secret\.metadata\.read/);
});

test('runtime authorization and policy checks appear before late credential broker resolution', () => {
  const gateway = source('services/runtimeGateway.service.js');
  const resolution = gateway.lastIndexOf('resolveCredentialForRuntime');
  assert.ok(gateway.indexOf("'policy_check'") < resolution);
  assert.ok(gateway.indexOf("'authorization_check'") < resolution);
  assert.ok(gateway.lastIndexOf('claimInvocationExecution({') < resolution);
  assert.ok(gateway.indexOf('brokeredCredential.release') > resolution);
});

test('durable worker propagates and revalidates credential binding evidence', () => {
  const durableWork = source('services/durableWork.service.js');
  const durableWorker = source('services/durableWorker.service.js');
  assert.match(durableWork, /credentialBindingId/);
  assert.match(durableWork, /credentialRequirement/);
  assert.match(durableWorker, /expectedCredentialBindingId/);
  assert.match(durableWorker, /sweepSecretLifecycle/);
});

test('manual retry validates current credential state after centralized authorization', () => {
  const control = source('services/invocationControl.service.js');
  assert.match(control, /permission: 'invocation\.retry'[\s\S]*requireCredentialState: true/);
  assert.ok(
    control.indexOf('assertAuthorized(') <
      control.lastIndexOf('validateCredentialStateForConnection'),
  );
});

test('migration is idempotent, preserves ciphertext, and quarantines ambiguous ownership', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'migrateSecretGovernance.js'),
    'utf8',
  );
  assert.match(migration, /migrationStatus === 'migrated'/);
  assert.match(migration, /AMBIGUOUS_AUTHORITATIVE_TENANT_OWNERSHIP/);
  assert.equal(/decryptPayload|decryptSecret/.test(migration), false);
  assert.equal(/deleteMany|remove\(/.test(migration), false);
});

test('health and readiness paths contain no provider credential validation', () => {
  const app = source('app.js');
  const readiness = source('controllers/healthController.js');
  assert.equal(/validateCredential|checkSecretHealth|resolveCredentialForRuntime/.test(app), false);
  assert.equal(
    /validateCredential|checkSecretHealth|resolveCredentialForRuntime/.test(readiness),
    false,
  );
});
