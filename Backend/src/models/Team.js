const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    externalWorkspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    memberUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EnterpriseUser' }],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      required: true,
      index: true,
    },
  },
  { timestamps: true, strict: 'throw' },
);

teamSchema.index({ partnerId: 1, externalWorkspaceId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);
