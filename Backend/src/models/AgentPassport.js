const mongoose = require('mongoose');

const agentPassportSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    partnerAgentId: { type: String, required: true, trim: true },
    protocol: { type: String, enum: ['agent-passport.v1'], required: true, default: 'agent-passport.v1' },
    agent: {
      id: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      provider: { type: String, required: true, trim: true },
      description: { type: String, required: true, trim: true },
      version: { type: String, required: true, trim: true },
      iconUrl: { type: String, trim: true },
    },
    auth: {
      type: { type: String, enum: ['no_auth_dev', 'api_key', 'bearer_token', 'oauth2'], required: true },
      scopes: [{ type: String, trim: true }],
      authorizationUrl: { type: String, trim: true },
      tokenUrl: { type: String, trim: true },
      header: { type: String, trim: true },
      scheme: { type: String, trim: true },
    },
    runtime: {
      type: { type: String, enum: ['rest', 'mcp'], required: true },
      endpoint: { type: String, required: true, trim: true },
      method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' },
      inputField: { type: String, trim: true },
      outputField: { type: String, trim: true },
      supportsStreaming: { type: Boolean, default: false },
      supportsLongRunningTasks: { type: Boolean, default: false },
    },
    install: {
      supportedModes: [
        {
          type: String,
          enum: ['delegated_runtime_access', 'auth_required', 'metadata_only'],
        },
      ],
      exchangeUrl: { type: String, trim: true },
      requiresUserConsent: { type: Boolean, default: true },
    },
    health: {
      endpoint: { type: String, trim: true },
      lastStatus: { type: String, trim: true },
      lastCheckedAt: { type: Date },
    },
    status: { type: String, enum: ['draft', 'valid', 'invalid', 'suspended'], default: 'draft', index: true },
    validationErrors: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true },
);

agentPassportSchema.index({ partnerId: 1, partnerAgentId: 1 }, { unique: true });
agentPassportSchema.index({ partnerId: 1, status: 1 });

module.exports = mongoose.models.AgentPassport || mongoose.model('AgentPassport', agentPassportSchema);
