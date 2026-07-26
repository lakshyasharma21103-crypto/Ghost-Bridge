const mongoose = require('mongoose');
const { WORKLOAD_CATEGORIES } = require('../constants/productionScale');

const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const workloadQuotaReservationSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    reservationType: { type: String, enum: ['queued_run', 'active_run', 'queued_node', 'active_node', 'invocation', 'compensation', 'recovery'], required: true },
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, required: true },
    quotaPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkloadQuotaPolicy' },
    quotaPolicyVersion: { type: Number, min: 1 },
    tenantSlotNumber: { type: Number, required: true, min: 1, max: 1_000_000 },
    workspaceSlotNumber: { type: Number, required: true, min: 1, max: 1_000_000 },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', index: true },
    nodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', index: true },
    units: { type: Number, required: true, min: 1, max: 1_000 },
    status: { type: String, enum: ['reserved', 'consumed', 'released', 'expired'], default: 'reserved', required: true, index: true },
    idempotencyKey: { type: String, required: true, trim: true, match: SAFE_HASH_PATTERN },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date },
    releasedAt: { type: Date },
    expiredAt: { type: Date },
  },
  { timestamps: true, strict: 'throw' },
);

workloadQuotaReservationSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKey: 1 },
  { unique: true, name: 'unique_quota_reservation_idempotency' },
);
workloadQuotaReservationSchema.index(
  { organizationId: 1, reservationType: 1, tenantSlotNumber: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['reserved', 'consumed'] } }, name: 'unique_active_tenant_quota_slot' },
);
workloadQuotaReservationSchema.index(
  { organizationId: 1, workspaceId: 1, reservationType: 1, workspaceSlotNumber: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['reserved', 'consumed'] } }, name: 'unique_active_workspace_quota_slot' },
);
workloadQuotaReservationSchema.index({ organizationId: 1, workspaceId: 1, status: 1, expiresAt: 1 });

module.exports = mongoose.models.WorkloadQuotaReservation || mongoose.model('WorkloadQuotaReservation', workloadQuotaReservationSchema);
