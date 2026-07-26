const mongoose = require('mongoose');
const { safeId, safeVersion, schema } = require('./releaseModelFields');

const buildProvenanceSchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  sourceRevision: { type: String, required: true, match: /^[a-f0-9]{7,64}$/i, index: true },
  sourceTreeState: { type: String, enum: ['clean', 'dirty', 'unknown'], required: true },
  buildEnvironmentCategory: { type: String, enum: ['local', 'ci', 'trusted_ci'], required: true },
  runtimeVersion: safeVersion(true),
  npmVersion: safeVersion(true),
  lockfileDigest: { type: String, required: true, match: /^sha256:[a-f0-9]{64}$/ },
  sourceManifestDigest: { type: String, required: true, match: /^sha256:[a-f0-9]{64}$/ },
  buildCommands: [{ type: String, trim: true, maxlength: 200 }],
  testCommandNames: [{ type: String, trim: true, maxlength: 200 }],
  buildStartedAt: { type: Date, required: true },
  buildCompletedAt: { type: Date, required: true },
  artifactDigests: [{ type: String, match: /^sha256:[a-f0-9]{64}$/ }],
  provenanceVersion: safeVersion(true),
  generatedByCategory: { type: String, enum: ['local_operator', 'ci', 'trusted_ci'], required: true },
  generatedAt: { type: Date, required: true },
}, { timestamps: false });
module.exports = mongoose.models.BuildProvenance || mongoose.model('BuildProvenance', buildProvenanceSchema);
