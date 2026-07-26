const mongoose = require('mongoose');
const {
  SECRET_VALIDATION_STATUSES,
  SECRET_VERSION_SCHEMA_VERSION,
  SECRET_VERSION_STATUSES,
} = require('../constants/secretGovernance');

const encryptedSecretPayloadSchema = new mongoose.Schema(
  {
    algorithm: { type: String, enum: ['aes-256-gcm'], required: true },
    keyVersion: { type: String, required: true, trim: true, maxlength: 64 },
    iv: { type: String, required: true, maxlength: 64 },
    tag: { type: String, required: true, maxlength: 64 },
    ciphertext: { type: String, required: true, maxlength: 250_000 },
    aadVersion: { type: Number, enum: [1], required: true },
  },
  { _id: false, strict: 'throw' },
);

const legacyEncryptedPayloadSchema = new mongoose.Schema(
  {
    algorithm: { type: String, enum: ['aes-256-gcm'], required: true },
    iv: { type: String, required: true, maxlength: 64 },
    tag: { type: String, required: true, maxlength: 64 },
    ciphertext: { type: String, required: true, maxlength: 250_000 },
  },
  { _id: false, strict: 'throw' },
);

const secretVersionSchema = new mongoose.Schema(
  {
    versionId: { type: String, required: true, trim: true, maxlength: 128 },
    secretId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    version: { type: Number, required: true, min: 1 },
    encryptedPayload: {
      type: encryptedSecretPayloadSchema,
      select: false,
    },
    legacyEncryptedPayload: {
      type: legacyEncryptedPayloadSchema,
      select: false,
    },
    encryptionFormat: {
      type: String,
      enum: ['AAD_V1', 'LEGACY_V1'],
      default: 'AAD_V1',
      required: true,
    },
    encryptionAlgorithm: { type: String, enum: ['aes-256-gcm'], required: true },
    encryptionKeyVersion: { type: String, required: true, trim: true, maxlength: 64, index: true },
    integrityMetadata: {
      aadVersion: { type: Number, min: 0, max: 1 },
      tenantBound: { type: Boolean, required: true },
    },
    encryptedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: SECRET_VERSION_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    validationStatus: {
      type: String,
      enum: SECRET_VALIDATION_STATUSES,
      default: 'PENDING',
      required: true,
    },
    validationMethod: { type: String, trim: true, maxlength: 64 },
    validationReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    validatedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    revokedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    destroyedAt: { type: Date },
    destructionReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    fingerprintDigest: { type: String, required: true, trim: true, select: false },
    safeFingerprint: { type: String, required: true, trim: true, maxlength: 32 },
    schemaVersion: {
      type: Number,
      enum: [SECRET_VERSION_SCHEMA_VERSION],
      default: SECRET_VERSION_SCHEMA_VERSION,
    },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

secretVersionSchema.index(
  { organizationId: 1, secretId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_secret_version_number' },
);
secretVersionSchema.index(
  { organizationId: 1, versionId: 1 },
  { unique: true, name: 'unique_tenant_secret_version_id' },
);
secretVersionSchema.index(
  { organizationId: 1, secretId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
    name: 'one_active_version_per_secret',
  },
);
secretVersionSchema.index({ organizationId: 1, status: 1, expiresAt: 1 });
secretVersionSchema.index({ encryptionKeyVersion: 1, status: 1 });

module.exports =
  mongoose.models.SecretVersion || mongoose.model('SecretVersion', secretVersionSchema);
