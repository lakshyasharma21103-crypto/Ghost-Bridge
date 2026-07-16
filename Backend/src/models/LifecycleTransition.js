const mongoose = require('mongoose');

const lifecycleTransitionSchema = new mongoose.Schema(
  {
    transitionId: { type: String, required: true, unique: true, trim: true },
    operationId: { type: String, required: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    resourceType: {
      type: String,
      enum: ['Organization', 'Workspace', 'Membership', 'ServiceAccount'],
      required: true,
    },
    resourceId: { type: String, required: true, trim: true, index: true },
    permission: { type: String, required: true, trim: true },
    oldState: { type: String, required: true, trim: true },
    newState: { type: String, required: true, trim: true },
    reasonCode: { type: String, required: true, trim: true },
    safeReason: { type: String, trim: true, maxlength: 1_000 },
    requestedBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, trim: true },
    approvalRequestId: { type: String, trim: true },
    policyDecision: { type: String, trim: true },
    traceId: { type: String, trim: true },
    requestId: { type: String, trim: true },
    occurredAt: { type: Date, required: true, default: Date.now },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

lifecycleTransitionSchema.index(
  { organizationId: 1, operationId: 1 },
  { unique: true, name: 'unique_tenant_lifecycle_operation' },
);
lifecycleTransitionSchema.index({
  organizationId: 1,
  resourceType: 1,
  resourceId: 1,
  occurredAt: -1,
});

module.exports =
  mongoose.models.LifecycleTransition ||
  mongoose.model('LifecycleTransition', lifecycleTransitionSchema);
