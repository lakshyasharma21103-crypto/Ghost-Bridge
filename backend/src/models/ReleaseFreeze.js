const mongoose = require('mongoose');
const { safeId, safeText, schema, tenantFields } = require('./releaseModelFields');
const freezeSchema = schema({
  scope: { type: String, enum: ['platform', 'region', 'organization', 'workspace', 'service_category'], required: true },
  scopeReference: safeId(true),
  ...tenantFields,
  status: { type: String, enum: ['open', 'restricted', 'frozen', 'emergency_only'], required: true },
  safeReason: safeText(1_000),
  effectiveAt: { type: Date, required: true },
  expiresAt: Date,
  approvalReference: safeId(),
  createdBy: { type: String, required: true, trim: true, maxlength: 200 },
});
freezeSchema.index({ scope: 1, scopeReference: 1, status: 1 }, { name: 'release_freeze_scope_status' });
freezeSchema.index({ effectiveAt: 1, expiresAt: 1 }, { name: 'release_freeze_window' });
module.exports = mongoose.models.ReleaseFreeze || mongoose.model('ReleaseFreeze', freezeSchema);
