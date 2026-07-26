const mongoose = require('mongoose');

const policyRevisionSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    generation: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

module.exports =
  mongoose.models.PolicyRevision || mongoose.model('PolicyRevision', policyRevisionSchema);
