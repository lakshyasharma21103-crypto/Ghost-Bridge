const mongoose = require('mongoose');
const { MANUAL_GATE_RESULTS } = require('../constants/releaseReadiness');
const { safeId, safeText, schema, tenantFields } = require('./releaseModelFields');
const manualGateSchema = schema({
  releaseCandidateId: safeId(true),
  ...tenantFields,
  gateKey: safeId(true),
  result: { type: String, enum: MANUAL_GATE_RESULTS, required: true },
  safeReasonCode: safeId(),
  evidenceReference: safeText(512),
  performedBy: { type: String, required: true, trim: true, maxlength: 200 },
  performedAt: { type: Date, required: true },
  expiresAt: Date,
  approvalReference: safeId(),
});
manualGateSchema.index({ releaseCandidateId: 1, gateKey: 1, performedAt: -1 }, { name: 'release_manual_gate_candidate_key' });
manualGateSchema.index({ result: 1, performedAt: -1 }, { name: 'release_manual_gate_result' });
manualGateSchema.index({ expiresAt: 1 }, { name: 'release_manual_gate_expiry' });
module.exports = mongoose.models.ReleaseManualGate || mongoose.model('ReleaseManualGate', manualGateSchema);
