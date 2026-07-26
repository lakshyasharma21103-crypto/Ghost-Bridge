const mongoose = require('mongoose');
const {
  ACCESS_REMEDIATION_STATUSES,
  ACCESS_REVIEW_DECISIONS,
} = require('../constants/enterpriseOperations');

const accessReviewItemSchema = new mongoose.Schema(
  {
    reviewItemId: { type: String, required: true, unique: true, trim: true },
    campaignId: { type: String, required: true, trim: true, index: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    subjectType: {
      type: String,
      enum: ['MEMBERSHIP', 'SERVICE_ACCOUNT', 'TEAM_MEMBERSHIP', 'ROLE_ASSIGNMENT'],
      required: true,
    },
    subjectActorId: { type: String, required: true, trim: true, index: true },
    currentAccess: { type: mongoose.Schema.Types.Mixed, required: true },
    accessSnapshotDigest: { type: String, required: true, trim: true },
    resourceScope: { type: mongoose.Schema.Types.Mixed, required: true },
    reviewerActorId: { type: String, trim: true, index: true },
    recommendation: { type: String, trim: true, maxlength: 500 },
    decision: { type: String, enum: ACCESS_REVIEW_DECISIONS },
    justification: { type: String, trim: true, maxlength: 1_000 },
    decidedAt: { type: Date },
    remediationStatus: {
      type: String,
      enum: ACCESS_REMEDIATION_STATUSES,
      default: 'PENDING',
      index: true,
    },
    remediatedAt: { type: Date },
    evidenceReferences: { type: [String], default: undefined },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

accessReviewItemSchema.index({ organizationId: 1, campaignId: 1, remediationStatus: 1 });
accessReviewItemSchema.index(
  { campaignId: 1, subjectType: 1, subjectActorId: 1 },
  { unique: true },
);

module.exports =
  mongoose.models.AccessReviewItem || mongoose.model('AccessReviewItem', accessReviewItemSchema);
