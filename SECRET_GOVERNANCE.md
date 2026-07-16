# Phase 13C3 Secret and Credential Governance

Phase 13C3 adds tenant-bound secret lifecycle management to the existing Agent Passport credential path. It is a security foundation, not a claim of complete production readiness.

## Security boundary

Public routes expose metadata and lifecycle operations only. There is no plaintext read, reveal, export, or lease-redemption route. `secret.metadata.read` and the legacy `credential.read` permission mean metadata only.

The trusted runtime order is:

1. authenticate the actor;
2. validate organization and workspace ownership;
3. authorize through the centralized Phase 13C1 registry;
4. evaluate Phase 13C2 policies;
5. validate the connection and its binding;
6. validate logical-secret and active-version lifecycle state and expiry;
7. create and atomically consume a short-lived, one-use internal lease;
8. decrypt in memory immediately before request construction;
9. inject provider authorization into the trusted REST adapter;
10. release credential references in `finally`.

Plaintext is not persisted in MongoDB, Invocation documents, WorkItems, dead letters, rotation attempts, leases, audits, logs, traces, metrics, policy explanations, frontend storage, or API responses. JavaScript strings cannot be reliably overwritten and Node.js cannot guarantee perfect plaintext memory erasure. Buffers are cleared on best effort where meaningful.

## Data model

- `GovernedSecret` is the logical tenant-owned inventory record. It contains provider/type, ownership, status, active and previous version references, rotation/expiry policy, safe health metadata, schema version, and optimistic revision.
- `SecretVersion` contains AES-256-GCM ciphertext, encryption-key version, unique IV, authentication tag, AAD/integrity metadata, lifecycle timestamps, and a keyed non-reversible short fingerprint. Ciphertext fields use `select: false`.
- `CredentialBinding` explicitly associates a connection with a logical secret and constrains workspace, adapter, environment, purpose, and optional capabilities. Cross-organization bindings are rejected.
- `CredentialLease` is internal metadata only. It is tenant-, workspace-, connection-, adapter-, purpose-, and optionally invocation-bound; leases are short-lived and one-use. The TTL index removes only transient lease evidence after a retention window.
- `CredentialRotationAttempt` persists an idempotent rotation state machine without plaintext.
- `EncryptionRewrapJob` persists resumable key-rewrap progress and safe failure counts.
- The existing `Credential` document remains as the rollback-compatible encrypted legacy record and gains governed references plus migration state. Existing ciphertext is not deleted in 13C3.

The primary indexes cover tenant/status inventory queries, tenant/secret/version uniqueness, expiry, active/previous references, provider/type, key-version usage, connection and secret bindings, rotation states/idempotency, and lease purge TTL.

## Encryption format and key provider

New versions use AES-256-GCM with a fresh 96-bit IV. Authenticated additional data is a stable encoding of:

- format marker and AAD version;
- organization ID;
- optional workspace ID;
- logical secret ID;
- secret version ID;
- credential type;
- schema version.

Changing authenticated tenant or secret metadata causes decryption to fail closed. Cryptographic errors return safe codes and never distinguish useful ciphertext details to public callers.

`encryptionKeyProvider.service.js` is the provider abstraction. The implemented provider is an environment key ring:

- `CREDENTIAL_ENCRYPTION_KEY_VERSION` selects the current key version;
- `CREDENTIAL_ENCRYPTION_KEY` remains the current-key compatibility input;
- `CREDENTIAL_ENCRYPTION_KEYS` may contain a JSON object of current and historical key versions;
- stored versions select their recorded key version for decryption;
- readiness metadata contains provider name and version availability, never key material.

AWS KMS, Google Cloud KMS, Azure Key Vault, Vault, and HSM implementations are extension points only; they are not implemented by this phase.

Encryption-key rewrap decrypts and re-encrypts one record at a time in memory, replaces ciphertext atomically, records its cursor and counts, is safe to resume, and skips records already on the target version. A tenant-scoped usage report must show zero remaining dependencies before an operator removes an old environment key. Ghost Bridge never removes old keys automatically.

## Lifecycle, expiry, and revocation

Logical statuses are `ACTIVE`, `DISABLED`, `REVOKED`, `EXPIRED`, and `DESTROYED`. Version statuses are `PENDING`, `ACTIVE`, `PREVIOUS`, `RETIRED`, `REVOKED`, `EXPIRED`, and `DESTROYED`.

Only locally/provider-validated versions can activate. Activation uses a transaction and revision check so runtime resolution sees either the old active version or the new one. A configured grace period marks the former version `PREVIOUS`; new work always selects `activeVersionId`. A previous version exists only for explicitly eligible in-flight semantics and is never selected by new broker resolutions. Revocation always wins over grace.

The durable worker performs deterministic expiry maintenance. It marks due versions and active logical secrets expired, emits safe audit/alert evidence, and records low-cardinality counters. The broker independently checks stored timestamps immediately before every dispatch, so delayed maintenance does not permit an expired credential to run. Expiry is never automatically extended.

Secret-, version-, and binding-level revocation block future broker resolution. Queued work re-runs authorization/policy in the durable worker and then revalidates its stored binding reference and current credential state. Manual retry validates current credential metadata before accepting the retry. A request already accepted by an external provider cannot be undone; revocation is guaranteed before a future dispatch and best effort after dispatch has begun.

## Credential rotation

Manual replacement accepts a new credential once, creates a pending encrypted version, validates it using the registered provider adapter, and atomically activates it. Rotation attempts use the persisted stages `REQUESTED`, `NEW_VERSION_STORED`, `VALIDATING`, `VALIDATED`, `ACTIVATING`, `ACTIVE`, `GRACE_PERIOD`, `OLD_VERSION_RETIRED`, `COMPLETED`, `FAILED`, and `RECOVERY_REQUIRED`. Idempotency keys prevent duplicate attempts.

Provider-managed rotation is available only through an explicitly registered adapter implementing the safe rotation contract. Ghost Bridge cannot rotate an arbitrary provider credential unless the provider supplies a supported rotation API. The built-in local-format adapter never fabricates provider keys and reports provider health `UNKNOWN` when it cannot make a safe non-billed validation request.

`HEALTHY` means supported provider validation actually succeeded. It never means only that decryption succeeded. `/health` remains dependency-free liveness and `/ready` performs no provider request or billable credential validation. An authorized health-check action is explicit and provider-adapter-specific.

OAuth payloads may contain encrypted access and refresh tokens. Only the access token is injected into the runtime request. Refresh tokens are never queued, logged, returned, or exposed through a lease. Automated refresh is not implemented; an adapter must explicitly implement a safe future refresh contract.

Delegated agent-runtime tokens use the same logical secret, version, binding, lease, and broker controls after installation. Legacy delegated credentials remain dual-readable during migration.

## Retry and recovery

Revoked, expired, disabled, invalid binding/version, integrity, decryption, missing configured key, and consumed/expired lease failures are non-retryable automatically. A provider validation outage may be transient. Future key-provider adapters may set `retryable: true` for a genuinely transient provider outage; missing environment key versions remain operator recovery conditions.

Integrity failure, missing historical key, and decryption failure set recovery-required evidence and raise safe operational alerts. Credential failure must not be converted to an ambiguous remote outcome when dispatch never started.

## API

All routes are below `/api/v1/secrets`, require Partner authentication, centralized permissions, policy evaluation, and tenant ownership checks.

- `GET /` and `GET /:secretId`: safe inventory/detail metadata.
- `POST /`: create and immediately encrypt a credential; response is metadata only.
- `GET|POST /:secretId/versions`: history or new pending version.
- `POST /:secretId/versions/:versionId/validate|activate|retire|revoke|destroy`.
- `POST /:secretId/rotate` and `GET /:secretId/rotations`.
- `POST /:secretId/disable|enable|revoke`.
- `GET|POST /:secretId/bindings` and `POST /:secretId/bindings/:bindingId/revoke`.
- `GET /:secretId/health` and `POST /:secretId/health/check`.
- `GET /encryption-keys/usage` and `POST /encryption-keys/rewrap`.
- `GET /audit`: safe tenant-scoped secret audit history.

No public plaintext or internal-lease redemption route exists.

## Permissions and policy attributes

Permission registry v3 adds:

- `secret.metadata.read`, `secret.create`, `secret.update`, `secret.rotate`, `secret.revoke`, and `secret.destroy`;
- `secret.binding.read` and `secret.binding.manage`;
- `secret.health.read` and `secret.health.check`;
- `secret.audit.read`;
- `encryption-key.metadata.read` and `encryption-key.rotate`.

Role assignments remain registry bundles, not business-logic role checks. Phase 13C2 receives trusted secret and binding attributes and may further restrict every administration action.

## Audit, metrics, alerts, and redaction

Safe events include create/version/validation/activation, rotation started/completed/failed, expiry, revoke/disable/destroy, bind/unbind, broker allow/deny, and key rewrap started/completed/failed. Events contain safe IDs, state, reason, key-version, lease, request, trace, and invocation metadata, never plaintext, ciphertext, headers, or provider bodies.

In-memory metrics accept an explicit low-cardinality label allowlist only. Secret, tenant, workspace, connection, user, and trace IDs cannot become metric labels. Alerts cover expiry, integrity/decryption, missing key versions, rotation recovery, and revoked access attempts.

Central redaction covers sensitive field names, nested objects, arrays, Authorization/cookies, install/runtime/access/refresh tokens, client/private keys, common provider patterns, signed URL query signatures, encrypted payloads, and credential-like query parameters. Field-name redaction remains primary; pattern matching is defense in depth.

## Migration and rollback

Run the idempotent backfill only against the intended environment:

```powershell
npm run migrate:secret-governance
```

The staged plan is:

1. deploy new models and indexes;
2. derive ownership only from the authoritative connection;
3. create logical metadata, version metadata retaining legacy ciphertext, and a binding;
4. write governed references back to `Credential` and `PassportConnection`;
5. enable broker dual-read and opportunistic development migration;
6. verify migrated records and key-version counts;
7. operate runtime resolution through the broker;
8. retain old ciphertext and references as rollback compatibility;
9. remove legacy fields only in a separately approved future phase.

Ambiguous records are marked `recovery_required`; tenant ownership is never guessed. The migration logs counts and safe reason codes only and never decrypts credentials or logs identifiers/values.

## Verification

The dedicated verifier is local and non-billed:

```powershell
npm run verify:secret-governance
```

It performs cryptographic/AAD/nonce, redaction, metadata-only API, runtime-ordering, durable-record, lifecycle, migration, permission, retry, and lease assertions. It makes no Gemini, Google Search, or deployed external-agent request.

The complete non-billed gate is `npm test`, the frontend build, `verify:demo`, `verify:sandbox`, `verify:policy-engine`, and `verify:secret-governance`. `verify:gemini-agent` and `verify:external-flow` remain manual billed release gates.

## Limitations and Phase 13C4 handoff

Production adoption still requires deployment validation, penetration testing, master-key procedures, key escrow/recovery design, disaster-recovery drills, load testing, provider-specific safe validation and rotation adapters, real credential/key rotation drills, and security incident exercises.

Recommended 13C4 work is approval/governance workflow design and production key-provider integration behind the existing interface, with provider-specific OAuth refresh/rotation contracts and no expansion of the public plaintext boundary.
