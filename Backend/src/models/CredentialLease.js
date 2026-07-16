const mongoose = require('mongoose');
const { LEASE_STATUSES } = require('../constants/secretGovernance');

const credentialLeaseSchema = new mongoose.Schema(
  {
    leaseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    secretId: { type: String, required: true, trim: true, maxlength: 128 },
    secretVersionId: { type: String, required: true, trim: true, maxlength: 128 },
    bindingId: { type: String, required: true, trim: true, maxlength: 128 },
    connectionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    invocationId: { type: mongoose.Schema.Types.ObjectId, index: true },
    adapterId: { type: String, required: true, trim: true, maxlength: 64 },
    allowedPurpose: { type: String, required: true, trim: true, maxlength: 100 },
    oneUse: { type: Boolean, default: true, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    purgeAt: { type: Date, required: true },
    consumedAt: { type: Date },
    revokedAt: { type: Date },
    status: { type: String, enum: LEASE_STATUSES, default: 'ISSUED', required: true, index: true },
    rejectionReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

credentialLeaseSchema.index(
  { purgeAt: 1 },
  { expireAfterSeconds: 0, name: 'credential_lease_ttl' },
);
credentialLeaseSchema.index({ organizationId: 1, workspaceId: 1, status: 1, expiresAt: 1 });
credentialLeaseSchema.index({ connectionId: 1, invocationId: 1, status: 1 });

module.exports =
  mongoose.models.CredentialLease || mongoose.model('CredentialLease', credentialLeaseSchema);
