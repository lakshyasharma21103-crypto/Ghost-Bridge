const mongoose = require('mongoose');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const schema = new mongoose.Schema(
  {
    transitionId: { type: String, required: true, unique: true, trim: true, match: SAFE_ID },
    authorityKey: { type: String, required: true, trim: true, maxlength: 512, index: true },
    organizationId: { type: String, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, trim: true, maxlength: 200, index: true },
    sourceRegionId: { type: String, trim: true, match: SAFE_ID },
    targetRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    sourceAuthorityEpoch: { type: Number, required: true, min: 0 },
    targetAuthorityEpoch: { type: Number, required: true, min: 1 },
    transitionType: { type: String, enum: ['acquire', 'renew', 'freeze', 'transfer', 'failback', 'fence'], required: true },
    status: { type: String, enum: ['committed', 'rejected'], required: true },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
    failoverPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegionalFailoverPlan' },
    requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
    requestId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, maxlength: 128 },
    committedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);
schema.index({ authorityKey: 1, targetAuthorityEpoch: -1 }, { unique: true, name: 'regional_authority_transition_epoch' });
schema.index({ organizationId: 1, workspaceId: 1, createdAt: -1 }, { name: 'regional_authority_transition_scope' });
module.exports = mongoose.models.RegionalAuthorityTransition || mongoose.model('RegionalAuthorityTransition', schema);
