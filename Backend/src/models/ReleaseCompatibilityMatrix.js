const mongoose = require('mongoose');
const { safeCodes, safeId, safeVersion, schema } = require('./releaseModelFields');

const compatibilitySchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  matrixVersion: safeVersion(true),
  backendProtocolVersion: safeVersion(true),
  externalAgentProtocolVersion: safeVersion(true),
  frontendApiVersion: safeVersion(true),
  supportedDatabaseSchemaVersions: [safeVersion()],
  supportedMigrationVersions: [safeVersion()],
  supportedRoutingVersions: [safeVersion()],
  supportedQueueOwnershipVersions: [safeVersion()],
  supportedAuthorityEpochFormatVersions: [safeVersion()],
  supportedCacheSerializationVersions: [safeVersion()],
  supportedProjectionVersions: [safeVersion()],
  supportedPassportVersions: [safeVersion()],
  supportedDataContractVersions: [safeVersion()],
  minimumCompatibleBackendVersion: safeVersion(true),
  minimumCompatibleWorkerVersion: safeVersion(true),
  minimumCompatibleExternalAgentVersion: safeVersion(true),
  rollingDeploymentCompatible: { type: Boolean, required: true },
  rollbackCompatible: { type: Boolean, required: true },
  rollForwardOnly: { type: Boolean, required: true, default: false },
  safeReasonCodes: safeCodes,
  generatedAt: { type: Date, required: true, index: true },
}, { timestamps: false });
module.exports = mongoose.models.ReleaseCompatibilityMatrix || mongoose.model('ReleaseCompatibilityMatrix', compatibilitySchema);
