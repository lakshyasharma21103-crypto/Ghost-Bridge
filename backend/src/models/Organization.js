const mongoose = require('mongoose');
const { ORGANIZATION_LIFECYCLE_STATES } = require('../constants/enterpriseOperations');

const organizationSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    status: {
      type: String,
      enum: ORGANIZATION_LIFECYCLE_STATES,
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

organizationSchema.index({ partnerId: 1, slug: 1 }, { unique: true, sparse: true });
organizationSchema.index({ partnerId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
