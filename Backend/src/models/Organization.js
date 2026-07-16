const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
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

organizationSchema.index({ partnerId: 1, slug: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
