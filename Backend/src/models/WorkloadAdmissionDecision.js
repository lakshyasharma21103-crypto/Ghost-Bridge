const mongoose = require('mongoose');
const { ADMISSION_CLASSES, ADMISSION_DECISIONS, PRIORITY_CLASSES, WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const workloadAdmissionDecisionSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, required: true, index: true },
    orchestrationDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition' },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', index: true },
    decision: { type: String, enum: ADMISSION_DECISIONS, required: true, index: true },
    safeReasonCodes: { type: [{ type: String, match: SAFE_CODE_PATTERN }], default: [] },
    admissionClass: { type: String, enum: ADMISSION_CLASSES, required: true },
    priorityClass: { type: String, enum: PRIORITY_CLASSES, required: true },
    tenantQueuedCount: { type: Number, default: 0, min: 0 },
    workspaceQueuedCount: { type: Number, default: 0, min: 0 },
    tenantActiveCount: { type: Number, default: 0, min: 0 },
    workspaceActiveCount: { type: Number, default: 0, min: 0 },
    systemLoadCategory: { type: String, enum: ['normal', 'elevated', 'saturated', 'shedding', 'paused'], required: true },
    workerCapacityCategory: { type: String, enum: ['available', 'constrained', 'saturated', 'unavailable'], required: true },
    queueAgeCategory: { type: String, enum: ['fresh', 'aging', 'stale', 'critical'], required: true },
    quotaPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkloadQuotaPolicy' },
    quotaPolicyVersion: { type: Number, min: 1 },
    quotaReservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkloadQuotaReservation' },
    requestId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN, index: true },
    traceId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN, index: true },
    requestedBy: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

workloadAdmissionDecisionSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1 });
workloadAdmissionDecisionSchema.index({ organizationId: 1, workspaceId: 1, decision: 1, createdAt: -1 });
workloadAdmissionDecisionSchema.index({ organizationId: 1, workspaceId: 1, workloadCategory: 1, createdAt: -1 });
workloadAdmissionDecisionSchema.index({ organizationId: 1, workspaceId: 1, requestId: 1 });

module.exports = mongoose.models.WorkloadAdmissionDecision || mongoose.model('WorkloadAdmissionDecision', workloadAdmissionDecisionSchema);
