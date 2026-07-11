const mongoose = require('mongoose');

const passportInstallKeySchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ['active', 'used', 'revoked', 'expired'], default: 'active', index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
    usedByWorkspaceId: { type: String, trim: true },
    usedByUserId: { type: String, trim: true },
    scope: { type: String, enum: ['resolve_only', 'connect', 'invoke'], required: true, default: 'connect' },
    installMode: {
      type: String,
      enum: ['delegated_runtime_access', 'auth_required', 'metadata_only'],
      required: true,
    },
    encryptedRuntimeGrant: { type: mongoose.Schema.Types.Mixed },
    runtimeGrantExpiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

passportInstallKeySchema.index({ partnerId: 1, passportId: 1, status: 1 });

module.exports =
  mongoose.models.PassportInstallKey || mongoose.model('PassportInstallKey', passportInstallKeySchema);
