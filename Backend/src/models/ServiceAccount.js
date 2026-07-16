const mongoose = require('mongoose');
const { SERVICE_ACCOUNT_LIFECYCLE_STATES } = require('../constants/enterpriseOperations');

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
      enum: SERVICE_ACCOUNT_LIFECYCLE_STATES,
      default: 'active',
      required: true,
      index: true,
    },
    expiresAt: { type: Date, index: true },
    lastUsedAt: { type: Date },
    rotatedAt: { type: Date },
    disabledAt: { type: Date },
    revokedAt: { type: Date },
    lifecycleRevision: { type: Number, default: 0, min: 0 },
    lifecycleReason: { type: String, trim: true, maxlength: 1_000 },
    lifecycleChangedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

serviceAccountSchema.index({ partnerId: 1, keyId: 1 }, { unique: true, sparse: true });
serviceAccountSchema.index({ partnerId: 1, externalWorkspaceId: 1, status: 1 });

module.exports =
  mongoose.models.ServiceAccount || mongoose.model('ServiceAccount', serviceAccountSchema);
