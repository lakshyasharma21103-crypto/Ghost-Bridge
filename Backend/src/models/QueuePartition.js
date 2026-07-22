const mongoose = require('mongoose');
const { WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

const queuePartitionSchema = new mongoose.Schema(
  {
    partitionKey: { type: String, required: true, unique: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, required: true, index: true },
    partitionNumber: { type: Number, required: true, min: 0, max: 255 },
    status: { type: String, enum: ['active', 'draining', 'paused', 'recovering', 'disabled'], default: 'active', required: true, index: true },
    routingVersion: { type: Number, required: true, min: 1, max: 1_000 },
    ownershipEpoch: { type: Number, default: 0, required: true, min: 0 },
    ownerWorkerId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, index: true },
    ownerInstanceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    leaseExpiresAt: { type: Date, index: true },
    heartbeatAt: { type: Date },
    lastClaimAt: { type: Date },
    lastCompletionAt: { type: Date },
    queuedCountEstimate: { type: Number, default: 0, min: 0 },
    activeCountEstimate: { type: Number, default: 0, min: 0 },
    oldestQueuedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

queuePartitionSchema.index(
  { workloadCategory: 1, routingVersion: 1, partitionNumber: 1 },
  { unique: true, name: 'unique_workload_routing_partition' },
);
queuePartitionSchema.index({ status: 1, leaseExpiresAt: 1 });
queuePartitionSchema.index({ ownerWorkerId: 1, leaseExpiresAt: 1 });

module.exports = mongoose.models.QueuePartition || mongoose.model('QueuePartition', queuePartitionSchema);
