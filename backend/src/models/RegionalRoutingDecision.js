const mongoose = require('mongoose');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const { ROUTING_OUTCOMES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const schema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, maxlength: 200, index: true },
    workspaceId: { type: String, required: true, trim: true, maxlength: 200, index: true },
    operationCategory: { type: String, required: true, trim: true, match: SAFE_ID },
    consistencyClass: { type: String, enum: Object.values(CONSISTENCY_CLASSES), required: true },
    requestedRegionId: { type: String, trim: true, match: SAFE_ID },
    selectedRegionId: { type: String, trim: true, match: SAFE_ID, index: true },
    activeWriteRegionId: { type: String, trim: true, match: SAFE_ID },
    authorityEpoch: { type: Number, required: true, min: 0 },
    outcome: { type: String, enum: ROUTING_OUTCOMES, required: true, index: true },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
    dataClassification: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], required: true },
    residencyTags: [{ type: String, trim: true, maxlength: 64 }],
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, strict: 'throw' },
);
schema.index({ organizationId: 1, workspaceId: 1, createdAt: -1 }, { name: 'regional_routing_scope_created' });
schema.index({ selectedRegionId: 1, outcome: 1, createdAt: -1 }, { name: 'regional_routing_region_outcome' });
module.exports = mongoose.models.RegionalRoutingDecision || mongoose.model('RegionalRoutingDecision', schema);
