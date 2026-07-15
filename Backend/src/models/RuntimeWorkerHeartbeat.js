const mongoose = require('mongoose');
const {
  RUNTIME_WORKER_HEARTBEAT_RETENTION_MS,
  RUNTIME_WORKER_STATUSES,
} = require('../constants/durableWork');

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;

const runtimeWorkerHeartbeatSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      trim: true,
      match: SAFE_IDENTIFIER_PATTERN,
      unique: true,
      index: true,
    },
    status: { type: String, enum: RUNTIME_WORKER_STATUSES, required: true, index: true },
    startedAt: { type: Date, required: true },
    lastHeartbeatAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date },
    activeWorkCount: { type: Number, required: true, min: 0, max: 1000 },
    draining: { type: Boolean, required: true, default: false },
    version: { type: String, trim: true, match: SAFE_VERSION_PATTERN },
  },
  { timestamps: true, strict: 'throw' },
);

runtimeWorkerHeartbeatSchema.index({ status: 1, lastHeartbeatAt: -1 });
runtimeWorkerHeartbeatSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'expire_retired_runtime_worker_heartbeats',
  },
);

module.exports =
  mongoose.models.RuntimeWorkerHeartbeat ||
  mongoose.model('RuntimeWorkerHeartbeat', runtimeWorkerHeartbeatSchema);
