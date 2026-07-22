const mongoose = require('mongoose');
const { WORKER_POOLS, WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;

const workerRegistrationSchema = new mongoose.Schema(
  {
    workerId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN, unique: true, index: true },
    instanceId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    workerPool: { type: String, enum: WORKER_POOLS, required: true, index: true },
    supportedWorkloadCategories: { type: [{ type: String, enum: WORKLOAD_CATEGORIES }], required: true, default: [] },
    supportedRoutingVersions: { type: [{ type: Number, min: 1, max: 1_000 }], required: true, default: [1] },
    status: { type: String, enum: ['starting', 'active', 'idle', 'draining', 'unhealthy', 'stopped'], default: 'starting', required: true, index: true },
    maximumConcurrency: { type: Number, required: true, min: 1, max: 1_000 },
    activeClaimCount: { type: Number, required: true, default: 0, min: 0, max: 1_000 },
    availableCapacity: { type: Number, required: true, default: 0, min: 0, max: 1_000 },
    startedAt: { type: Date, required: true },
    heartbeatAt: { type: Date, required: true, index: true },
    drainRequestedAt: { type: Date },
    stoppedAt: { type: Date },
    softwareVersion: { type: String, trim: true, match: SAFE_VERSION_PATTERN },
    protocolVersion: { type: String, trim: true, match: SAFE_VERSION_PATTERN },
    safeRegion: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    safeZone: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN },
  },
  { timestamps: true, strict: 'throw' },
);

workerRegistrationSchema.index({ workerPool: 1, status: 1, heartbeatAt: -1 });
workerRegistrationSchema.index({ heartbeatAt: 1, status: 1 });
workerRegistrationSchema.index({ supportedRoutingVersions: 1, status: 1 });

module.exports = mongoose.models.WorkerRegistration || mongoose.model('WorkerRegistration', workerRegistrationSchema);
