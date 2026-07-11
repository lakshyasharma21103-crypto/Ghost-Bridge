const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    apiKeyHash: { type: String, required: true, index: true },
    allowedOrigins: [{ type: String, trim: true }],
    plan: { type: String, default: 'developer', trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);
