const GovernedSecret = require('../models/GovernedSecret');
const SecretVersion = require('../models/SecretVersion');
const CredentialRotationAttempt = require('../models/CredentialRotationAttempt');
const OperationalAlert = require('../models/OperationalAlert');
const { createAuditLog } = require('./auditService');
const metrics = require('./secretMetrics.service');
const { SECRET_AUDIT_EVENTS } = require('../constants/secretGovernance');

async function auditExpiry(secret, versionId) {
  try {
    await createAuditLog(
      'system',
      'system:secret-lifecycle-worker',
      SECRET_AUDIT_EVENTS.EXPIRED,
      'Secret',
      secret.secretId,
      {
        organizationId: secret.organizationId,
        workspaceId: secret.workspaceId,
        secretId: secret.secretId,
        secretVersionId: versionId,
        oldState: 'ACTIVE',
        newState: 'EXPIRED',
        reasonCode: 'CREDENTIAL_EXPIRY_REACHED',
      },
    );
  } catch {
    // Runtime resolution still rejects authoritative expiry timestamps if audit is unavailable.
  }
}

async function auditGraceCompletion(secret, versionId) {
  try {
    await createAuditLog(
      'system',
      'system:secret-lifecycle-worker',
      SECRET_AUDIT_EVENTS.ROTATION_COMPLETED,
      'Secret',
      secret.secretId,
      {
        organizationId: secret.organizationId,
        workspaceId: secret.workspaceId,
        secretId: secret.secretId,
        secretVersionId: versionId,
        oldState: 'PREVIOUS',
        newState: 'RETIRED',
        reasonCode: 'ROTATION_GRACE_PERIOD_ENDED',
      },
    );
  } catch {
    // Lifecycle state remains authoritative if best-effort audit persistence is unavailable.
  }
}

async function upsertExpiryAlert(secret, reasonCode, now) {
  const workspaceId = secret.workspaceId || `organization:${secret.organizationId}`;
  await OperationalAlert.updateOne(
    { dedupeKey: `secret-expiry:${secret.organizationId}:${secret.secretId}:${reasonCode}` },
    {
      $set: {
        receivingWorkspaceId: workspaceId,
        type: 'credential_expiry',
        scopeKey: secret.secretId,
        severity: reasonCode === 'SECRET_EXPIRED' ? 'critical' : 'warning',
        status: 'active',
        title: 'Governed credential expiry requires attention',
        summary: 'A governed credential is expired or approaching expiry.',
        metricName: 'credential_expiry',
        observedValue: 1,
        thresholdValue: 1,
        safeValues: { reasonCode },
        lastSeenAt: now,
      },
      $setOnInsert: { firstSeenAt: now },
      $inc: { occurrenceCount: 1 },
    },
    { upsert: true },
  );
}

async function sweepSecretLifecycle(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));
  const expiredVersions = await SecretVersion.find({
    status: { $in: ['PENDING', 'ACTIVE', 'PREVIOUS'] },
    expiresAt: { $lte: now },
  })
    .select('organizationId workspaceId secretId versionId status')
    .limit(limit)
    .lean();
  let versionCount = 0;
  let secretCount = 0;
  for (const version of expiredVersions) {
    const changed = await SecretVersion.updateOne(
      { _id: version._id, status: version.status, expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED' }, $inc: { revision: 1 } },
    );
    if (!changed.modifiedCount) continue;
    versionCount += 1;
    const secret = await GovernedSecret.findOne({
      organizationId: version.organizationId,
      secretId: version.secretId,
    });
    if (secret && String(secret.activeVersionId || '') === String(version.versionId)) {
      const logical = await GovernedSecret.updateOne(
        { _id: secret._id, activeVersionId: version.versionId, status: 'ACTIVE' },
        {
          $set: {
            status: 'EXPIRED',
            healthStatus: 'EXPIRED',
            lastHealthReasonCode: 'SECRET_EXPIRED',
            lastHealthCheckedAt: now,
          },
          $inc: { revision: 1 },
        },
      );
      if (logical.modifiedCount) {
        secretCount += 1;
        await auditExpiry(secret, version.versionId);
        await upsertExpiryAlert(secret, 'SECRET_EXPIRED', now).catch(() => undefined);
      }
    }
  }
  const warningHorizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const warnings = await GovernedSecret.find({
    status: 'ACTIVE',
    expiresAt: { $gt: now, $lte: warningHorizon },
  })
    .select('organizationId workspaceId secretId expiresAt')
    .limit(limit)
    .lean();
  await Promise.all(
    warnings.map((secret) =>
      upsertExpiryAlert(secret, 'SECRET_EXPIRY_WARNING', now).catch(() => undefined),
    ),
  );
  const gracePeriods = await GovernedSecret.find({
    status: 'ACTIVE',
    previousVersionId: { $exists: true, $ne: null },
    gracePeriodEndsAt: { $lte: now },
  })
    .select('organizationId workspaceId secretId previousVersionId gracePeriodEndsAt')
    .limit(limit);
  let retiredPreviousVersions = 0;
  for (const secret of gracePeriods) {
    const retired = await SecretVersion.updateOne(
      {
        organizationId: secret.organizationId,
        secretId: secret.secretId,
        versionId: secret.previousVersionId,
        status: 'PREVIOUS',
      },
      { $set: { status: 'RETIRED', retiredAt: now }, $inc: { revision: 1 } },
    );
    const cleared = await GovernedSecret.updateOne(
      {
        _id: secret._id,
        previousVersionId: secret.previousVersionId,
        gracePeriodEndsAt: { $lte: now },
      },
      { $unset: { previousVersionId: 1, gracePeriodEndsAt: 1 }, $inc: { revision: 1 } },
    );
    if (!cleared.modifiedCount) continue;
    retiredPreviousVersions += retired.modifiedCount;
    await auditGraceCompletion(secret, secret.previousVersionId);
    await CredentialRotationAttempt.updateMany(
      {
        organizationId: secret.organizationId,
        secretId: secret.secretId,
        oldVersionId: secret.previousVersionId,
        stage: 'GRACE_PERIOD',
      },
      {
        $set: { stage: 'COMPLETED', completedAt: now },
        $push: {
          history: {
            $each: [
              { stage: 'OLD_VERSION_RETIRED', at: now },
              { stage: 'COMPLETED', at: now },
            ],
            $slice: -50,
          },
        },
        $inc: { revision: 1 },
      },
    );
  }
  metrics.increment('credential_expiry', { outcome: 'expired_version' }, versionCount);
  metrics.increment('credential_expiry', { outcome: 'expired_secret' }, secretCount);
  metrics.increment('credential_expiry', { outcome: 'warning' }, warnings.length);
  metrics.increment('credential_rotation', { outcome: 'grace_completed' }, retiredPreviousVersions);
  return {
    expiredVersions: versionCount,
    expiredSecrets: secretCount,
    expiryWarnings: warnings.length,
    retiredPreviousVersions,
    checkedAt: now,
  };
}

module.exports = { sweepSecretLifecycle };
