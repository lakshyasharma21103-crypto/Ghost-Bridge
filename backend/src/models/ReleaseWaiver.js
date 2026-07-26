const mongoose = require('mongoose');
const { safeId, safeText, schema, tenantFields } = require('./releaseModelFields');
const waiverSchema = schema({
  releaseCandidateId: safeId(true),
  ...tenantFields,
  findingCode: safeId(true),
  boundedReason: safeText(1_000),
  riskCategory: { type: String, enum: ['low', 'moderate', 'high', 'critical', 'unknown'], required: true },
  mitigation: safeText(1_000),
  expiresAt: { type: Date, required: true, index: true },
  approver: { type: String, required: true, trim: true, maxlength: 200 },
  approvalReference: safeId(true),
  linkedIncidentOrChangeRequest: safeId(),
  scope: { type: String, enum: ['release', 'gate', 'finding'], required: true },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'expired'], default: 'requested' },
});
waiverSchema.index({ releaseCandidateId: 1, status: 1 }, { name: 'release_waiver_candidate_status' });
module.exports = mongoose.models.ReleaseWaiver || mongoose.model('ReleaseWaiver', waiverSchema);
