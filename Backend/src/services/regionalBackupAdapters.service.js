const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const core = require('./regionalResilienceCore.service');

class BackupAdapter {
  async requestBackup() { throw new AppError(503, 'REGION_BACKUP_ADAPTER_DISABLED', 'Backup adapter is disabled.'); }
  async getBackupStatus() { throw new AppError(503, 'REGION_BACKUP_ADAPTER_DISABLED', 'Backup adapter is disabled.'); }
  async listBackups() { return []; }
  async verifyBackup() { throw new AppError(503, 'REGION_BACKUP_ADAPTER_DISABLED', 'Backup adapter is disabled.'); }
  async requestRestore() { throw new AppError(503, 'REGION_BACKUP_ADAPTER_DISABLED', 'Restore adapter is disabled.'); }
  async getRestoreStatus() { throw new AppError(503, 'REGION_BACKUP_ADAPTER_DISABLED', 'Restore adapter is disabled.'); }
  async cancelRestore() { return false; }
  async deleteExpiredBackupMetadata() { return 0; }
  async health() { return { adapterType: 'base', status: 'disabled' }; }
}

class NoopBackupAdapter extends BackupAdapter {
  constructor() { super(); this.adapterType = 'noop'; }
  async health() { return { adapterType: this.adapterType, status: 'disabled' }; }
}

class MockBackupAdapter extends BackupAdapter {
  constructor(options = {}) {
    super();
    this.adapterType = 'mock';
    this.nowMs = Number(options.nowMs || Date.UTC(2026, 0, 1));
    this.integritySecret = options.integritySecret || 'deterministic-test-integrity-secret';
    this.backups = new Map();
    this.restores = new Map();
  }

  advance(ms) { this.nowMs += Math.max(0, Number(ms) || 0); }

  async requestBackup(input = {}) {
    core.assertNoSensitiveData(input);
    const idempotencyKey = core.safeIdentifier(input.idempotencyKey, 'idempotencyKey');
    const existing = [...this.backups.values()].find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) return { ...existing, replayed: true };
    const backupId = `backup-${String(this.backups.size + 1).padStart(4, '0')}`;
    const collectionSummaries = (input.collectionSummaries || []).map((entry) => ({
      collectionName: entry.collectionName,
      safeDocumentCount: Math.max(0, Number(entry.safeDocumentCount || 0)),
      safeByteCategory: entry.safeByteCategory || 'unknown',
      indexManifestVersion: entry.indexManifestVersion || 'unknown',
      schemaVersion: entry.schemaVersion || input.schemaVersion || 'unknown',
      sequenceRange: entry.sequenceRange || { minimum: 0, maximum: 0 },
      ...(entry.integrityMaterial ? { keyedIntegrityDigest: core.integrityDigest(entry.integrityMaterial, this.integritySecret) } : {}),
    }));
    const backup = {
      backupId,
      providerReferenceId: `mock-reference-${backupId}`,
      idempotencyKey,
      regionId: input.regionId,
      sourceRegionId: input.sourceRegionId || input.regionId,
      status: 'completed',
      startedAt: new Date(this.nowMs),
      completedAt: new Date(this.nowMs + 1_000),
      recoverableThrough: new Date(this.nowMs),
      expiresAt: new Date(this.nowMs + Number(input.retentionMs || 86_400_000)),
      collectionSummaries,
      verificationStatus: 'unverified',
    };
    this.backups.set(backupId, backup);
    return { ...backup, replayed: false };
  }

  async getBackupStatus(backupId) { const item = this.backups.get(backupId); return item ? { ...item } : null; }
  async listBackups() { return [...this.backups.values()].map((entry) => ({ ...entry })).sort((left, right) => left.backupId.localeCompare(right.backupId)); }

  async verifyBackup(input = {}) {
    const backup = this.backups.get(input.backupId);
    if (!backup) throw new AppError(404, 'REGION_BACKUP_NOT_FOUND', 'Backup was not found.');
    const manifest = { collectionSummaries: backup.collectionSummaries };
    const result = core.validateIntegrityManifest(manifest, { collectionSummaries: input.expectedCollectionSummaries || [] }, this.integritySecret);
    backup.verificationStatus = result.overallIntegrityStatus;
    backup.status = result.valid ? 'verified' : 'verification_required';
    backup.lastVerifiedAt = new Date(this.nowMs);
    return { ...result, backupId: backup.backupId, verifiedAt: backup.lastVerifiedAt, manifestVersion: 1, collectionSummaries: backup.collectionSummaries };
  }

  async requestRestore(input = {}) {
    core.assertNoSensitiveData(input);
    const backup = this.backups.get(input.backupId);
    if (!backup) throw new AppError(404, 'REGION_BACKUP_NOT_FOUND', 'Backup was not found.');
    if (backup.verificationStatus !== 'verified') throw new AppError(409, 'REGION_BACKUP_NOT_VERIFIED', 'Only a verified backup may be restored.');
    const restoreId = `restore-${String(this.restores.size + 1).padStart(4, '0')}`;
    const restore = {
      restoreId,
      backupId: backup.backupId,
      sourceRegionId: backup.sourceRegionId,
      targetRegionId: input.targetRegionId,
      status: 'restoring',
      isolatedTargetReference: `isolated-${crypto.createHash('sha256').update(`${restoreId}:${input.targetRegionId}`).digest('hex').slice(0, 16)}`,
      externalInvocationsEnabled: false,
      credentialUseEnabled: false,
      outboundCallbacksEnabled: false,
      startedAt: new Date(this.nowMs),
    };
    this.restores.set(restoreId, restore);
    return { ...restore };
  }

  async getRestoreStatus(restoreId) { const item = this.restores.get(restoreId); return item ? { ...item } : null; }
  async cancelRestore(restoreId) { const item = this.restores.get(restoreId); if (!item || ['promoted', 'cleaned_up'].includes(item.status)) return false; item.status = 'cancelled'; return true; }
  async deleteExpiredBackupMetadata(now = new Date(this.nowMs)) { let deleted = 0; for (const [id, item] of this.backups) if (new Date(item.expiresAt) <= now) { this.backups.delete(id); deleted += 1; } return deleted; }
  async health() { return { adapterType: this.adapterType, status: 'healthy', backupCountCategory: this.backups.size ? 'nonzero' : 'none' }; }
}

module.exports = { BackupAdapter, MockBackupAdapter, NoopBackupAdapter };
