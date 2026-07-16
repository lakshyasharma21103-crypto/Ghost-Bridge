const mongoose = require('mongoose');
const { PERMISSION_REGISTRY_VERSION } = require('../constants/permissionRegistry');

const roleSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    key: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    scope: {
      type: String,
      enum: ['organization', 'workspace'],
      default: 'workspace',
      required: true,
    },
    builtIn: { type: Boolean, default: false, index: true },
    registryVersion: { type: Number, default: PERMISSION_REGISTRY_VERSION, min: 1 },
    permissions: [{ type: String, required: true, trim: true }],
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

roleSchema.index({ partnerId: 1, key: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Role || mongoose.model('Role', roleSchema);
