const mongoose = require('mongoose');

const connectionTrustRecordSchema = new mongoose.Schema(
  {
    connectionId: { type: String, required: true, trim: true, maxlength: 200 },
    issuerId: { type: String, required: true, trim: true, maxlength: 500 },
    agentId: { type: String, required: true, trim: true, maxlength: 200 },
    passportId: { type: String, required: true, trim: true, maxlength: 200 },
    passportVersion: { type: String, required: true, trim: true, maxlength: 100 },
    passportDigest: { type: String, required: true, trim: true, maxlength: 100 },
    capabilityManifestDigest: { type: String, required: true, trim: true, maxlength: 100 },
    verifiedIssuerKeyId: { type: String, required: true, trim: true, maxlength: 128 },
    verifiedIssuerKeyThumbprint: { type: String, required: true, trim: true, maxlength: 100 },
    agentExecutionKeyThumbprints: [{ type: String, maxlength: 100 }],
    trustProfileVersion: { type: String, required: true, maxlength: 100 },
    selectedAuthenticationProfile: { type: String, required: true, maxlength: 100 },
    hostAudience: { type: String, required: true, maxlength: 500 },
    organizationId: { type: String, required: true, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    approvedCapabilities: [{ type: String, maxlength: 200 }],
    trustPolicyVersion: { type: String, required: true, maxlength: 100 },
    trustDecision: {
      type: String,
      required: true,
      enum: ['verified_and_trusted', 'cryptographically_valid_review_required', 'cryptographically_valid_untrusted_issuer', 'verified_with_warning', 'indeterminate', 'suspended', 'revoked', 'blocked', 'invalid'],
    },
    verifiedAt: { type: Date, required: true },
    nextVerificationAt: { type: Date, required: true },
    revocationFreshness: { type: String, required: true, maxlength: 40 },
    lastIssuerMetadataSequence: { type: Number, required: true, min: 1 },
    lastRevocationSequence: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['active', 'suspended', 'revoked', 'expired'], default: 'active' },
    credentialReference: { type: String, maxlength: 500 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

connectionTrustRecordSchema.index({ connectionId: 1 }, { unique: true, name: 'unique_connection_trust' });
connectionTrustRecordSchema.index({ organizationId: 1, workspaceId: 1, issuerId: 1, status: 1 });
connectionTrustRecordSchema.index({ passportId: 1, passportVersion: 1 });
connectionTrustRecordSchema.index({ nextVerificationAt: 1, status: 1 });

module.exports =
  mongoose.models.ConnectionTrustRecord ||
  mongoose.model('ConnectionTrustRecord', connectionTrustRecordSchema);
