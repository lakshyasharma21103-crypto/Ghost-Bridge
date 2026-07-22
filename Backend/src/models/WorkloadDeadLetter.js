const mongoose = require('mongoose');
const { PRIORITY_CLASSES, WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const workloadDeadLetterSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    safeJobId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    sourceType: { type: String, enum: ['orchestration_node', 'runtime_work', 'control_job'], required: true },
    sourceRecordId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, required: true, index: true },
    priorityClass: { type: String, enum: PRIORITY_CLASSES, required: true },
    routingVersion: { type: Number, required: true, min: 1 },
    partitionNumber: { type: Number, required: true, min: 0, max: 255 },
    status: { type: String, enum: ['dead_lettered', 'retry_requested', 'archived', 'terminated'], default: 'dead_lettered', required: true, index: true },
    safeFailureCode: { type: String, required: true, trim: true, match: SAFE_CODE_PATTERN, index: true },
    attemptCount: { type: Number, required: true, min: 0, max: 1_000 },
    requestId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    traceId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN },
    lastAttemptAt: { type: Date },
    retryRequestedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

workloadDeadLetterSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
workloadDeadLetterSchema.index({ organizationId: 1, workspaceId: 1, workloadCategory: 1, createdAt: -1 });
workloadDeadLetterSchema.index({ sourceType: 1, sourceRecordId: 1 }, { unique: true, name: 'unique_dead_letter_source' });

module.exports = mongoose.models.WorkloadDeadLetter || mongoose.model('WorkloadDeadLetter', workloadDeadLetterSchema);
