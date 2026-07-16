const mongoose = require('mongoose');

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
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      required: true,
      index: true,
    },
  },
  { timestamps: true, strict: 'throw' },
);

workspaceSchema.index(
  { partnerId: 1, externalWorkspaceId: 1 },
  { unique: true, name: 'unique_partner_workspace' },
);
workspaceSchema.index({ organizationId: 1, slug: 1 });

module.exports = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
