const mongoose = require('mongoose');
const { HEALTH_CATEGORIES, HEALTH_STATUSES, LAG_CATEGORIES } = require('../constants/regionalResilience');
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const fields = Object.fromEntries(['serviceHealthCategory', 'databaseHealthCategory', 'replicationHealthCategory', 'cacheHealthCategory', 'queueHealthCategory', 'workerHealthCategory', 'gatewayHealthCategory'].map((key) => [key, { type: String, enum: HEALTH_CATEGORIES, required: true }]));
const schema = new mongoose.Schema(
  {
    regionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    snapshotAt: { type: Date, required: true, index: true },
    status: { type: String, enum: HEALTH_STATUSES, required: true, index: true },
    ...fields,
    healthyServiceCount: { type: Number, required: true, min: 0 },
    degradedServiceCount: { type: Number, required: true, min: 0 },
    unavailableServiceCount: { type: Number, required: true, min: 0 },
    activeWorkerCount: { type: Number, required: true, min: 0 },
    queuedWorkCategory: { type: String, enum: ['none', 'low', 'moderate', 'high', 'critical', 'unknown'], required: true },
    oldestQueueAgeCategory: { type: String, enum: ['fresh', 'elevated', 'stale', 'critical', 'unknown'], required: true },
    replicationLagCategory: { type: String, enum: LAG_CATEGORIES, required: true },
    measuredReplicationLagMs: { type: Number, min: 0 },
    lastConfirmedWriteAt: Date,
    lastConfirmedReadAt: Date,
    writeAuthorityEpoch: { type: Number, required: true, min: 0 },
    authorityLeaseHealth: { type: String, enum: ['healthy', 'expiring', 'expired', 'missing', 'unknown'], required: true },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
    generatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: false, strict: 'throw' },
);
schema.index({ regionId: 1, snapshotAt: -1 }, { name: 'regional_health_region_snapshot' });
schema.index({ status: 1, snapshotAt: -1 }, { name: 'regional_health_status' });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'regional_health_expiry' });
module.exports = mongoose.models.RegionalHealthSnapshot || mongoose.model('RegionalHealthSnapshot', schema);
