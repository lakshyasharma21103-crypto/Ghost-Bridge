const mongoose = require('mongoose');
const { BACKPRESSURE_STATES, DATABASE_PRESSURE_CATEGORIES, WORKER_POOLS } = require('../constants/productionScale');

const workloadBackpressureStateSchema = new mongoose.Schema(
  {
    scopeKey: { type: String, required: true, trim: true, maxlength: 256 },
    workerPool: { type: String, enum: WORKER_POOLS, required: true },
    state: { type: String, enum: BACKPRESSURE_STATES, required: true, index: true },
    queueDepth: { type: Number, required: true, min: 0 },
    oldestQueueAgeMs: { type: Number, required: true, min: 0 },
    workerUtilizationBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    claimLatencyCategory: { type: String, enum: ['low', 'elevated', 'high', 'unknown'], required: true },
    completionThroughput: { type: Number, required: true, min: 0 },
    databasePressureCategory: { type: String, enum: DATABASE_PRESSURE_CATEGORIES, required: true },
    leaseExpiryRateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    failureRateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    retryRateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    sloBurnRateCategory: { type: String, enum: ['normal', 'elevated', 'critical', 'unknown'], required: true },
    configurationVersion: { type: Number, required: true, min: 1 },
    evaluatedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, strict: 'throw' },
);

workloadBackpressureStateSchema.index({ scopeKey: 1, workerPool: 1 }, { unique: true, name: 'unique_scoped_pool_backpressure' });
workloadBackpressureStateSchema.index({ state: 1, evaluatedAt: -1 });

module.exports = mongoose.models.WorkloadBackpressureState || mongoose.model('WorkloadBackpressureState', workloadBackpressureStateSchema);
