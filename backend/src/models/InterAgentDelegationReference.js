const mongoose = require('mongoose');

const delegationReferenceSchema = new mongoose.Schema(
  {
    referenceHash: { type: String, required: true, immutable: true, unique: true, select: false },
    delegationGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationGrant', required: true, immutable: true, index: true },
    delegationInvocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationInvocation', required: true, immutable: true },
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', immutable: true },
    sourceNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true },
    targetNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract', required: true, immutable: true },
    contractVersion: { type: Number, required: true, min: 1, immutable: true },
    audience: { type: String, enum: ['ghost-bridge-runtime-gateway'], required: true, immutable: true },
    nonce: { type: String, required: true, immutable: true, select: false },
    issuedAt: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true, index: true },
    consumedAt: { type: Date },
    invalidatedAt: { type: Date },
  },
  { timestamps: false, strict: 'throw' },
);

delegationReferenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expire_internal_delegation_references' });
delegationReferenceSchema.index({ delegationGrantId: 1, consumedAt: 1, expiresAt: 1 });

module.exports =
  mongoose.models.InterAgentDelegationReference ||
  mongoose.model('InterAgentDelegationReference', delegationReferenceSchema);
