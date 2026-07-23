const mongoose = require('mongoose');
const { LAG_CATEGORIES, REPLICATION_DOMAINS, REPLICATION_STATUSES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const schema = new mongoose.Schema(
  {
    sourceRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    targetRegionId: { type: String, required: true, trim: true, match: SAFE_ID },
    dataDomain: { type: String, enum: REPLICATION_DOMAINS, required: true },
    status: { type: String, enum: REPLICATION_STATUSES, required: true, index: true },
    lagMs: { type: Number, min: 0 },
    lagCategory: { type: String, enum: LAG_CATEGORIES, required: true },
    lastAppliedSequence: { type: Number, min: 0 },
    lastVerifiedAt: Date,
    lastSuccessfulWriteAt: Date,
    lastSuccessfulReadAt: Date,
    promotionEligible: { type: Boolean, required: true },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, strict: 'throw' },
);
schema.index({ sourceRegionId: 1, targetRegionId: 1, dataDomain: 1, generatedAt: -1 }, { name: 'regional_replication_pair_domain' });
schema.index({ status: 1, generatedAt: -1 }, { name: 'regional_replication_status' });
module.exports = mongoose.models.RegionalReplicationHealth || mongoose.model('RegionalReplicationHealth', schema);
