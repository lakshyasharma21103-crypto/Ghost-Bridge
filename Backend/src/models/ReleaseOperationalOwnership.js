const mongoose = require('mongoose');
const { safeId, schema } = require('./releaseModelFields');
const ownershipSchema = schema({
  serviceCategory: safeId(true),
  operationalDomain: safeId(true),
  version: { type: Number, required: true, min: 1, max: 1_000_000 },
  primaryOwnerReference: safeId(true),
  secondaryOwnerReference: safeId(true),
  escalationPolicyReference: safeId(true),
  runbookReference: safeId(true),
  supportWindowCategory: { type: String, enum: ['business_hours', 'extended', 'continuous'], required: true },
  lastReviewedAt: { type: Date, required: true },
  nextReviewAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'review_required', 'archived'], default: 'active' },
});
ownershipSchema.index({ serviceCategory: 1, operationalDomain: 1, version: 1 }, { unique: true, name: 'release_ownership_version' });
ownershipSchema.index({ status: 1 }, { name: 'release_ownership_status' });
module.exports = mongoose.models.ReleaseOperationalOwnership || mongoose.model('ReleaseOperationalOwnership', ownershipSchema);
