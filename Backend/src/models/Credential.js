const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    receivingWorkspaceId: { type: String, trim: true, index: true },
    type: {
      type: String,
      enum: ['no_auth_dev', 'api_key', 'bearer_token', 'oauth2', 'delegated_runtime_access'],
      required: true,
    },
    encryptedPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'invalid'],
      default: 'active',
      index: true,
    },
    expiresAt: { type: Date },
    governedSecretId: { type: String, trim: true, maxlength: 128, index: true },
    governedVersionId: { type: String, trim: true, maxlength: 128 },
    credentialBindingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CredentialBinding',
      index: true,
    },
    migrationStatus: {
      type: String,
      enum: ['legacy', 'pending', 'migrated', 'recovery_required'],
      default: 'legacy',
      index: true,
    },
    migrationReasonCode: { type: String, trim: true, maxlength: 128 },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

credentialSchema.index({ connectionId: 1, status: 1 });
credentialSchema.index({ partnerId: 1, receivingWorkspaceId: 1, status: 1 });
credentialSchema.index({ organizationId: 1, migrationStatus: 1, updatedAt: 1 });

module.exports = mongoose.models.Credential || mongoose.model('Credential', credentialSchema);
