const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  decryptSecret,
  encryptSecret,
  healthMetadata,
} = require('../src/services/encryptionKeyProvider.service');
const { redactSecrets } = require('../src/utils/redact');
const { isRetryableError } = require('../src/utils/retryability');
const { listPermissions } = require('../src/constants/permissionRegistry');
const { SECRET_STATUSES, SECRET_VERSION_STATUSES } = require('../src/constants/secretGovernance');
const RuntimeWorkItem = require('../src/models/RuntimeWorkItem');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function pass(name) {
  console.log(`PASS ${name}`);
}

function verify() {
  const context = {
    organizationId: 'org_verify',
    workspaceId: 'workspace_verify',
    secretId: 'sec_verify',
    versionId: 'sver_verify',
    credentialType: 'api_key',
    schemaVersion: 1,
  };
  const plaintext = Buffer.from(JSON.stringify({ apiKey: 'verify-secret-never-persist' }));
  const first = encryptSecret({ plaintext, context });
  const second = encryptSecret({ plaintext, context });
  assert.notEqual(first.iv, second.iv);
  assert.equal(JSON.stringify(first).includes('verify-secret-never-persist'), false);
  const decrypted = decryptSecret({ encryptedPayload: first, context });
  assert.equal(decrypted.toString(), plaintext.toString());
  decrypted.fill(0);
  assert.throws(() =>
    decryptSecret({
      encryptedPayload: first,
      context: { ...context, organizationId: 'org_other' },
    }),
  );
  plaintext.fill(0);
  pass('authenticated encrypted persistence, unique IVs, and tenant-bound AAD');

  const metadata = healthMetadata();
  assert.equal(typeof metadata.currentKeyVersion, 'string');
  assert.equal(Object.hasOwn(metadata, 'keyMaterial'), false);
  pass('versioned environment key-provider metadata contains no key material');

  const redacted = redactSecrets({
    nested: [{ authorization: 'Bearer never-log-this-value' }],
    providerError: 'provider rejected sk-proj-abcdefghijklmnopqrstuvwxyz123456',
    signedUrl: 'https://example.test/file?x-amz-signature=private-signature',
  });
  assert.equal(JSON.stringify(redacted).includes('never-log-this-value'), false);
  assert.equal(JSON.stringify(redacted).includes('private-signature'), false);
  assert.equal(JSON.stringify(redacted).includes('sk-proj-'), false);
  pass('nested, array, provider-key, header, and signed-URL redaction');

  const routes = source('src/routes/secretRoutes.js');
  assert.equal(/\/plaintext|\/reveal|\/export/i.test(routes), false);
  assert.match(routes, /secret\.metadata\.read/);
  pass('metadata-only public API surface has no plaintext or reveal endpoint');

  const gateway = source('src/services/runtimeGateway.service.js');
  assert.ok(
    gateway.indexOf("'authorization_check'") < gateway.lastIndexOf('resolveCredentialForRuntime'),
  );
  assert.match(gateway, /brokeredCredential\.release/);
  pass('authorization and policy precede late broker resolution and release');

  const workSchema = RuntimeWorkItem.schema.path('credentialBindingId');
  assert.ok(workSchema);
  assert.ok(RuntimeWorkItem.schema.path('credentialRequirement.adapterId'));
  assert.equal(RuntimeWorkItem.schema.path('credentialHeaders'), undefined);
  assert.equal(RuntimeWorkItem.schema.path('plaintextCredential'), undefined);
  pass('durable records contain binding requirements without credential material');

  const worker = source('src/services/durableWorker.service.js');
  assert.match(worker, /expectedCredentialBindingId/);
  assert.match(worker, /sweepSecretLifecycle/);
  const maintenance = source('src/services/secretLifecycleMaintenance.service.js');
  assert.match(maintenance, /ROTATION_GRACE_PERIOD_ENDED/);
  assert.match(maintenance, /stage: 'OLD_VERSION_RETIRED'/);
  pass('queued work revalidates binding state and runs deterministic expiry maintenance');

  const migration = source('scripts/migrateSecretGovernance.js');
  assert.match(migration, /migrationStatus === 'migrated'/);
  assert.match(migration, /AMBIGUOUS_AUTHORITATIVE_TENANT_OWNERSHIP/);
  assert.equal(/decryptPayload|decryptSecret/.test(migration), false);
  pass('idempotent dual-read migration preserves ciphertext and quarantines ambiguity');

  const permissions = new Set(listPermissions().map((item) => item.id));
  for (const id of [
    'secret.metadata.read',
    'secret.create',
    'secret.rotate',
    'secret.revoke',
    'secret.binding.manage',
    'secret.audit.read',
    'encryption-key.rotate',
  ]) {
    assert.ok(permissions.has(id), `missing permission ${id}`);
  }
  assert.ok(SECRET_STATUSES.includes('REVOKED'));
  assert.ok(SECRET_VERSION_STATUSES.includes('PREVIOUS'));
  pass('canonical permissions and lifecycle states are registered');

  assert.equal(isRetryableError({ code: 'SECRET_REVOKED', statusCode: 503 }), false);
  assert.equal(isRetryableError({ code: 'KMS_UNAVAILABLE', retryable: true }), true);
  pass('permanent credential failures and transient key-provider failures classify safely');

  const broker = source('src/services/credentialBroker.service.js');
  assert.match(broker, /CredentialLease\.create/);
  assert.match(broker, /status: 'CONSUMED'/);
  assert.match(broker, /status !== 'ACTIVE'/);
  pass('one-use credential leases, lifecycle checks, expiry, and revocation are enforced');

  console.log('Secret governance verification passed without external provider requests.');
}

try {
  verify();
} catch (error) {
  console.error(`FAIL secret governance verification: ${error.message}`);
  process.exitCode = 1;
}
