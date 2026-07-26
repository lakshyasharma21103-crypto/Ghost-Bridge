const mongoose = require('mongoose');
const { MEMBERSHIP_LIFECYCLE_STATES } = require('../constants/enterpriseOperations');

const roleBindingSchema = new mongoose.Schema(
  {
    roleKey: { type: String, trim: true, lowercase: true, index: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    scopeType: {
      type: String,
      enum: ['organization', 'workspace', 'team'],
      default: 'workspace',
      required: true,
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    externalWorkspaceId: { type: String, trim: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  },
  { _id: false, strict: 'throw' },
);

const enterpriseUserSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    externalUserId: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true },
    workspaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }],
    externalWorkspaceIds: [{ type: String, trim: true }],
    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    roleBindings: { type: [roleBindingSchema], default: [] },
    status: {
      type: String,
      enum: MEMBERSHIP_LIFECYCLE_STATES,
      default: 'active',
      required: true,
      index: true,
    },
    lifecycleRevision: { type: Number, default: 0, min: 0 },
    lifecycleReason: { type: String, trim: true, maxlength: 1_000 },
    lifecycleChangedAt: { type: Date },
    suspendedAt: { type: Date },
    removedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

enterpriseUserSchema.index(
  { partnerId: 1, externalUserId: 1 },
  { unique: true, name: 'unique_partner_enterprise_user' },
);
enterpriseUserSchema.index({ partnerId: 1, status: 1, updatedAt: -1 });

module.exports =
  mongoose.models.EnterpriseUser || mongoose.model('EnterpriseUser', enterpriseUserSchema);
