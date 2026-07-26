const mongoose = require('mongoose');
const {
  FLEET_CONTROL_ACTIONS,
  FLEET_CONTROL_SCOPE_TYPES,
  FLEET_CONTROL_STATUSES,
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
} = require('../constants/orchestrationObservability');

const orchestrationFleetControlSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    scopeType: { type: String, enum: FLEET_CONTROL_SCOPE_TYPES, required: true, index: true },
    scopeId: { type: String, required: true, trim: true, maxlength: 160, index: true },
    status: { type: String, enum: FLEET_CONTROL_STATUSES, required: true, index: true },
    action: { type: String, enum: FLEET_CONTROL_ACTIONS, required: true },
    safeReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE_PATTERN },
    safeReason: { type: String, trim: true, maxlength: 1000 },
    requestedBy: { type: String, required: true, trim: true, maxlength: 128 },
    releasedBy: { type: String, trim: true, maxlength: 128 },
    requestedAt: { type: Date, required: true, default: Date.now },
    releasedAt: { type: Date },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    requestId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationFleetControlSchema.index(
  { organizationId: 1, workspaceId: 1, scopeType: 1, scopeId: 1, status: 1 },
  {
    unique: true,
    name: 'unique_active_orchestration_fleet_control',
    partialFilterExpression: { status: { $in: ['paused', 'draining', 'quarantined'] } },
  },
);
orchestrationFleetControlSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });

module.exports =
  mongoose.models.OrchestrationFleetControl ||
  mongoose.model('OrchestrationFleetControl', orchestrationFleetControlSchema);
