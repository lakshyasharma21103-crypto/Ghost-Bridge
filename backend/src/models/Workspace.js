const mongoose = require('mongoose');
const { WORKSPACE_LIFECYCLE_STATES } = require('../constants/enterpriseOperations');

const workspaceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    externalWorkspaceId: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    environment: {
      type: String,
      enum: ['DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true,
    },
    productionApproved: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC', trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: WORKSPACE_LIFECYCLE_STATES,
      default: 'active',
      required: true,
      index: true,
    },
    lifecycleRevision: { type: Number, default: 0, min: 0 },
    lifecycleReason: { type: String, trim: true, maxlength: 1_000 },
    lifecycleOperationId: { type: String, trim: true, index: true },
    lifecycleRequestedBy: { type: String, trim: true },
    lifecycleApprovedBy: { type: String, trim: true },
    lifecycleChangedAt: { type: Date },
    suspendedAt: { type: Date },
    reactivatedAt: { type: Date },
    archivedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

workspaceSchema.index(
  { partnerId: 1, externalWorkspaceId: 1 },
  { unique: true, name: 'unique_partner_workspace' },
);
workspaceSchema.index({ organizationId: 1, slug: 1 });
workspaceSchema.index({ partnerId: 1, externalWorkspaceId: 1, status: 1 });

module.exports = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
