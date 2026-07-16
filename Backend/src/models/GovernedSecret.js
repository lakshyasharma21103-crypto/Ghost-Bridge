const mongoose = require('mongoose');
const {
  CREDENTIAL_TYPES,
  OWNERSHIP_SCOPES,
  SECRET_HEALTH_STATUSES,
  SECRET_SCHEMA_VERSION,
  SECRET_STATUSES,
} = require('../constants/secretGovernance');

const rotationPolicySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['MANUAL', 'PROVIDER_MANAGED'], default: 'MANUAL' },
    gracePeriodSeconds: { type: Number, default: 0, min: 0, max: 604_800 },
    rotationDueAt: { type: Date },
    warningWindowDays: { type: Number, default: 14, min: 0, max: 365 },
  },
  { _id: false, strict: 'throw' },
);

const expiryPolicySchema = new mongoose.Schema(
  { warningWindowDays: { type: Number, default: 14, min: 0, max: 365 } },
  { _id: false, strict: 'throw' },
);

const governedSecretSchema = new mongoose.Schema(
  {
    secretId: { type: String, required: true, trim: true, maxlength: 128 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 2_000 },
    provider: { type: String, required: true, trim: true, maxlength: 100 },
    credentialType: { type: String, enum: CREDENTIAL_TYPES, required: true },
    ownershipScope: { type: String, enum: OWNERSHIP_SCOPES, required: true },
    status: { type: String, enum: SECRET_STATUSES, default: 'ACTIVE', required: true, index: true },
    activeVersionId: { type: String, trim: true, maxlength: 128, index: true },
    previousVersionId: { type: String, trim: true, maxlength: 128 },
    gracePeriodEndsAt: { type: Date },
    rotationPolicy: { type: rotationPolicySchema, default: () => ({}) },
    expiryPolicy: { type: expiryPolicySchema, default: () => ({}) },
    expiresAt: { type: Date, index: true },
    healthStatus: {
      type: String,
      enum: SECRET_HEALTH_STATUSES,
      default: 'UNKNOWN',
      required: true,
      index: true,
    },
    lastHealthCheckedAt: { type: Date },
    lastHealthReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    lastRotatedAt: { type: Date },
    revokedAt: { type: Date },
    destroyedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    schemaVersion: { type: Number, enum: [SECRET_SCHEMA_VERSION], default: SECRET_SCHEMA_VERSION },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

governedSecretSchema.index(
  { organizationId: 1, secretId: 1 },
  { unique: true, name: 'unique_tenant_secret' },
);
governedSecretSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
governedSecretSchema.index({ organizationId: 1, provider: 1, credentialType: 1, status: 1 });
governedSecretSchema.index({ expiresAt: 1, status: 1 });
governedSecretSchema.index({ 'rotationPolicy.rotationDueAt': 1, status: 1 });

module.exports =
  mongoose.models.GovernedSecret || mongoose.model('GovernedSecret', governedSecretSchema);
