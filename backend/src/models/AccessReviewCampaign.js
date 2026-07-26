const mongoose = require('mongoose');
const { ACCESS_REVIEW_STATUSES } = require('../constants/enterpriseOperations');

const accessReviewCampaignSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2_000 },
    status: { type: String, enum: ACCESS_REVIEW_STATUSES, default: 'DRAFT', index: true },
    scope: { type: mongoose.Schema.Types.Mixed, required: true },
    reviewerRules: { type: mongoose.Schema.Types.Mixed, required: true },
    startedAt: { type: Date },
    dueAt: { type: Date, required: true, index: true },
    completedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

accessReviewCampaignSchema.index({ organizationId: 1, workspaceId: 1, status: 1, dueAt: 1 });
accessReviewCampaignSchema.index({ dueAt: 1, status: 1 });

module.exports =
  mongoose.models.AccessReviewCampaign ||
  mongoose.model('AccessReviewCampaign', accessReviewCampaignSchema);
