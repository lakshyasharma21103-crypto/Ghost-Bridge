const mongoose = require('mongoose');
const { SERVICE_STATES, SERVICE_TYPES } = require('../constants/regionalResilience');
const { WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;
const schema = new mongoose.Schema(
  {
    serviceId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    instanceId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    regionId: { type: String, required: true, trim: true, match: SAFE_ID, index: true },
    serviceType: { type: String, enum: SERVICE_TYPES, required: true, index: true },
    supportedWorkloadCategories: [{ type: String, enum: WORKLOAD_CATEGORIES }],
    supportedRoutingVersions: [{ type: Number, min: 1, max: 1_000 }],
    softwareVersion: { type: String, trim: true, match: SAFE_VERSION },
    protocolVersion: { type: String, trim: true, match: SAFE_VERSION },
    state: { type: String, enum: SERVICE_STATES, required: true, default: 'starting', index: true },
    writeAuthorityEpoch: { type: Number, required: true, default: 0, min: 0 },
    currentAuthorityLeaseId: { type: String, trim: true, match: SAFE_ID },
    maximumConcurrency: { type: Number, required: true, min: 0, max: 1_000 },
    activeClaimCount: { type: Number, required: true, default: 0, min: 0, max: 1_000 },
    safeZone: { type: String, trim: true, match: SAFE_ID },
    safeDeploymentCategory: { type: String, trim: true, match: SAFE_ID },
    startedAt: { type: Date, required: true },
    heartbeatAt: { type: Date, required: true, index: true },
    lastReadyAt: Date,
    drainRequestedAt: Date,
    stoppedAt: Date,
  },
  { timestamps: true, strict: 'throw' },
);
schema.index({ serviceId: 1, instanceId: 1 }, { unique: true, name: 'regional_service_identity' });
schema.index({ regionId: 1, serviceType: 1, state: 1 }, { name: 'regional_service_region_type_state' });
schema.index({ heartbeatAt: 1 }, { name: 'regional_service_heartbeat' });
module.exports = mongoose.models.RegionalServiceRegistration || mongoose.model('RegionalServiceRegistration', schema);
