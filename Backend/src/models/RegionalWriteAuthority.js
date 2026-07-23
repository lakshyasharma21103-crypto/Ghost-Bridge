const mongoose = require('mongoose');
const { AUTHORITY_STATUSES, REGIONAL_SCOPES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const schema = new mongoose.Schema(
  {
    authorityKey: { type: String, required: true, unique: true, trim: true, maxlength: 512 },
    scope: { type: String, enum: REGIONAL_SCOPES, required: true },
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    activeRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    authorityEpoch: { type: Number, required: true, min: 1 },
    status: { type: String, enum: AUTHORITY_STATUSES, required: true, default: 'active', index: true },
    leaseOwnerServiceId: { type: String, required: true, trim: true, match: SAFE_ID },
    leaseId: { type: String, required: true, trim: true, match: SAFE_ID },
    leaseEpoch: { type: Number, required: true, min: 1 },
    leaseExpiresAt: { type: Date, required: true, index: true },
    heartbeatAt: { type: Date, required: true },
    lastTransitionId: { type: String, trim: true, match: SAFE_ID },
    lastTransitionAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);
schema.index({ scope: 1, organizationId: 1, workspaceId: 1 }, { name: 'regional_authority_scope' });
schema.index({ leaseExpiresAt: 1, status: 1 }, { name: 'regional_authority_lease' });
schema.index({ authorityEpoch: 1 }, { name: 'regional_authority_epoch' });
module.exports = mongoose.models.RegionalWriteAuthority || mongoose.model('RegionalWriteAuthority', schema);
