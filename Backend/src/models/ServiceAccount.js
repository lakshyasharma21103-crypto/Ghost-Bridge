const mongoose = require('mongoose');

const roleBindingSchema = new mongoose.Schema(
  {
    roleKey: { type: String, trim: true, lowercase: true, index: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    scopeType: {
      type: String,
      enum: ['organization', 'workspace'],
      default: 'organization',
      required: true,
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    externalWorkspaceId: { type: String, trim: true },
  },
  { _id: false, strict: 'throw' },
);

const serviceAccountSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    externalWorkspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    keyId: { type: String, trim: true, index: true },
    roleBindings: { type: [roleBindingSchema], default: [] },
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

serviceAccountSchema.index({ partnerId: 1, keyId: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.ServiceAccount || mongoose.model('ServiceAccount', serviceAccountSchema);
