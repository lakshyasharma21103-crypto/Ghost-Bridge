const mongoose = require('mongoose');
const { safeId, safeVersion, schema } = require('./releaseModelFields');

const releaseManifestSchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  manifestVersion: safeVersion(true),
  sourceRevision: { type: String, required: true, match: /^[a-f0-9]{7,64}$/i },
  applicationVersion: safeVersion(true),
  workspaceVersions: {
    backend: safeVersion(true),
    frontend: safeVersion(true),
    externalAgent: safeVersion(true),
  },
  protocolVersions: [safeVersion()],
  schemaVersion: safeVersion(true),
  migrationVersion: safeVersion(true),
  routingVersions: [safeVersion()],
  cacheSerializationVersions: [safeVersion()],
  projectionVersions: [safeVersion()],
  requiredEnvironmentVariableNames: [{ type: String, trim: true, maxlength: 128 }],
  optionalEnvironmentVariableNames: [{ type: String, trim: true, maxlength: 128 }],
  forbiddenProductionVariableNames: [{ type: String, trim: true, maxlength: 128 }],
  requiredIndexes: [{ type: String, trim: true, maxlength: 200 }],
  migrationIds: [safeId()],
  featureFlagSnapshotId: safeId(),
  compatibilityMatrixId: safeId(),
  expectedRuntimeServices: [safeId()],
  expectedWorkerPools: [safeId()],
  expectedRegions: [safeId()],
  buildArtifactDigests: [{ type: String, trim: true, match: /^sha256:[a-f0-9]{64}$/ }],
  softwareBillOfMaterialsReference: safeId(),
  generatedAt: { type: Date, required: true },
}, { timestamps: false });

releaseManifestSchema.index({ sourceRevision: 1 }, { name: 'release_manifest_revision' });
releaseManifestSchema.index({ applicationVersion: 1 }, { name: 'release_manifest_application_version' });
module.exports = mongoose.models.ReleaseManifest || mongoose.model('ReleaseManifest', releaseManifestSchema);
