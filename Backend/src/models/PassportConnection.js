const mongoose = require('mongoose');

const passportConnectionSchema = new mongoose.Schema(
  {
    passportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentPassport',
      required: true,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    receivingWorkspaceId: { type: String, required: true, trim: true, index: true },
    receivingUserId: { type: String, required: true, trim: true },
    installScope: {
      type: String,
      enum: ['resolve_only', 'connect', 'invoke'],
      required: true,
      default: 'connect',
    },
    status: {
      type: String,
      enum: ['pending_auth', 'connected', 'disconnected', 'error'],
      default: 'pending_auth',
      index: true,
    },
    resolvedPassportSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    runtimeType: { type: String, enum: ['rest', 'mcp'], required: true },
    runtimeEndpoint: { type: String, required: true, trim: true },
    credentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },
    lastHealthStatus: { type: String, trim: true },
    lastHealthCheckedAt: { type: Date },
  },
  { timestamps: true },
);

passportConnectionSchema.index({ receivingWorkspaceId: 1, passportId: 1 });
passportConnectionSchema.index({ receivingWorkspaceId: 1, status: 1, updatedAt: -1 });
passportConnectionSchema.index({ receivingWorkspaceId: 1, lastHealthStatus: 1, updatedAt: -1 });

module.exports =
  mongoose.models.PassportConnection ||
  mongoose.model('PassportConnection', passportConnectionSchema);
