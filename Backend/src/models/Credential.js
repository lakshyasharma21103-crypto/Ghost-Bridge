const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, index: true },
    type: {
      type: String,
      enum: ['no_auth_dev', 'api_key', 'bearer_token', 'oauth2', 'delegated_runtime_access'],
      required: true,
    },
    encryptedPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['active', 'expired', 'revoked', 'invalid'], default: 'active', index: true },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

credentialSchema.index({ connectionId: 1, status: 1 });

module.exports = mongoose.models.Credential || mongoose.model('Credential', credentialSchema);
