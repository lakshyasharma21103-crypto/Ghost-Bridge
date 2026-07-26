const mongoose = require('mongoose');
const { BINDING_STATUSES } = require('../constants/secretGovernance');

const credentialBindingSchema = new mongoose.Schema(
  {
    bindingId: { type: String, required: true, trim: true, maxlength: 128 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    secretId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    provider: { type: String, required: true, trim: true, maxlength: 100 },
    purpose: { type: String, required: true, trim: true, maxlength: 100 },
    allowedAdapter: { type: String, required: true, enum: ['rest', 'mcp'] },
    allowedEnvironment: {
      type: String,
      enum: ['development', 'test', 'staging', 'production', 'any'],
      default: 'any',
    },
    capabilityRestrictions: { type: [String], default: undefined },
    status: {
      type: String,
      enum: BINDING_STATUSES,
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    revokedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

credentialBindingSchema.index(
  { organizationId: 1, bindingId: 1 },
  { unique: true, name: 'unique_tenant_credential_binding' },
);
credentialBindingSchema.index(
  { organizationId: 1, connectionId: 1, purpose: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
    name: 'one_active_binding_per_connection_purpose',
  },
);
credentialBindingSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
credentialBindingSchema.index({ organizationId: 1, secretId: 1, status: 1 });

module.exports =
  mongoose.models.CredentialBinding || mongoose.model('CredentialBinding', credentialBindingSchema);
