const mongoose = require('mongoose');

const issuerTrustRecordSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    issuerId: { type: String, required: true, trim: true, maxlength: 500 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    reviewState: {
      type: String,
      required: true,
      enum: ['discovered', 'pending_review', 'approved', 'approved_with_limits', 'suspended', 'blocked', 'expired_review', 'revoked'],
      default: 'discovered',
    },
    approvedScope: {
      selectedAgentIds: [{ type: String, maxlength: 200 }],
      selectedCapabilityKeys: [{ type: String, maxlength: 200 }],
      riskCeiling: { type: String, enum: ['low', 'moderate', 'high', 'critical'] },
      expiresAt: { type: Date },
    },
    rootKeyThumbprints: [{ type: String, maxlength: 100 }],
    observedKeys: [{
      _id: false,
      kid: { type: String, required: true, maxlength: 128 },
      thumbprint: { type: String, required: true, maxlength: 100 },
      state: { type: String, required: true, maxlength: 32 },
      purpose: [{ type: String, maxlength: 64 }],
      firstObservedAt: { type: Date, required: true },
      lastObservedAt: { type: Date, required: true },
    }],
    metadataSequence: { type: Number, min: 1 },
    metadataExpiresAt: { type: Date },
    revocationSequence: { type: Number, min: 0, default: 0 },
    revocationFreshness: {
      type: String,
      enum: ['fresh', 'nearing_expiry', 'stale', 'unavailable', 'invalid', 'rollback_detected'],
      default: 'unavailable',
    },
    trustProfileVersion: { type: String, default: 'ghostbridge-trust/0.1-draft', maxlength: 100 },
    trustPolicyVersion: { type: String, maxlength: 100 },
    lastVerifiedAt: { type: Date },
    warningCodes: [{ type: String, maxlength: 100 }],
    reviewedBy: { type: String, maxlength: 200 },
    reviewedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

issuerTrustRecordSchema.index(
  { organizationId: 1, workspaceId: 1, issuerId: 1 },
  { unique: true, name: 'unique_scoped_issuer_trust' },
);
issuerTrustRecordSchema.index({ organizationId: 1, reviewState: 1, updatedAt: -1 });
issuerTrustRecordSchema.index({ issuerId: 1, metadataSequence: -1 });
issuerTrustRecordSchema.index({ issuerId: 1, 'observedKeys.kid': 1 });
issuerTrustRecordSchema.index({ issuerId: 1, 'observedKeys.thumbprint': 1 });

module.exports =
  mongoose.models.IssuerTrustRecord ||
  mongoose.model('IssuerTrustRecord', issuerTrustRecordSchema);
