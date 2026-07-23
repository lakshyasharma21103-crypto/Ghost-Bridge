const mongoose = require('mongoose');
const { safeId, schema, tenantFields } = require('./releaseModelFields');
const evidenceSchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  ...tenantFields,
  releaseManifestId: safeId(true),
  buildProvenanceId: safeId(true),
  artifactManifestId: safeId(true),
  compatibilityMatrixId: safeId(true),
  migrationPlanId: safeId(true),
  rolloutPlanId: safeId(),
  summaries: { type: mongoose.Schema.Types.Mixed, required: true },
  manualGateResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
  waiverReferences: [safeId()],
  evidenceDigest: { type: String, required: true, unique: true, match: /^sha256:[a-f0-9]{64}$/ },
  generatedBy: { type: String, required: true, trim: true, maxlength: 200 },
  generatedAt: { type: Date, required: true, index: true },
  approvedAt: Date,
}, { minimize: false });
module.exports = mongoose.models.ReleaseEvidencePackage || mongoose.model('ReleaseEvidencePackage', evidenceSchema);
