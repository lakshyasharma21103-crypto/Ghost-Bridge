const mongoose = require('mongoose');
const { safeId, safeVersion, schema } = require('./releaseModelFields');

const artifactSchema = new mongoose.Schema({
  logicalName: safeId(true),
  artifactVersion: safeVersion(true),
  safeRelativePath: { type: String, required: true, trim: true, maxlength: 512, validate: (value) => !pathIsUnsafe(value) },
  byteSizeCategory: { type: String, enum: ['small', 'medium', 'large'], required: true },
  sha256Digest: { type: String, required: true, match: /^sha256:[a-f0-9]{64}$/ },
  generatedAt: { type: Date, required: true },
}, { _id: false, strict: 'throw' });
function pathIsUnsafe(value) {
  return /(^[A-Za-z]:|^\.\.|(?:^|\/)\.env(?:\.|$)|node_modules)/i.test(String(value));
}
const artifactManifestSchema = schema({
  releaseCandidateId: { ...safeId(true), unique: true },
  manifestVersion: safeVersion(true),
  artifacts: { type: [artifactSchema], validate: (items) => items.length > 0 && items.length <= 100 },
  aggregateDigest: { type: String, required: true, match: /^sha256:[a-f0-9]{64}$/ },
  generatedAt: { type: Date, required: true },
}, { timestamps: false });
module.exports = mongoose.models.ReleaseArtifactManifest || mongoose.model('ReleaseArtifactManifest', artifactManifestSchema);
