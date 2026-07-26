const mongoose = require('mongoose');
const { POLICY_EFFECTS, POLICY_SCHEMA_VERSION, POLICY_STATUSES } = require('../constants/policy');

const targetSchema = new mongoose.Schema(
  {
    permissionIds: { type: [String], default: undefined },
    resourceTypes: { type: [String], default: undefined },
    resourceIds: { type: [String], default: undefined },
    actorTypes: { type: [String], default: undefined },
    organizationIds: { type: [String], default: undefined },
    workspaceIds: { type: [String], default: undefined },
    passportIds: { type: [String], default: undefined },
    connectionIds: { type: [String], default: undefined },
    capabilityIds: { type: [String], default: undefined },
    capabilityCategories: { type: [String], default: undefined },
    capabilityClassifications: { type: [String], default: undefined },
    sideEffects: { type: [String], default: undefined },
    environments: { type: [String], default: undefined },
  },
  { _id: false, strict: 'throw' },
);

const policySchema = new mongoose.Schema(
  {
    stablePolicyId: { type: String, required: true, trim: true, maxlength: 128 },
    version: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 2_000 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    status: { type: String, enum: POLICY_STATUSES, default: 'DRAFT', required: true, index: true },
    effect: { type: String, enum: POLICY_EFFECTS, required: true },
    target: { type: targetSchema, required: true, default: () => ({}) },
    condition: { type: mongoose.Schema.Types.Mixed, required: true },
    priority: { type: Number, default: 0, min: -10_000, max: 10_000 },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    revisionMetadata: {
      parentVersion: { type: Number, min: 1 },
      changeSummary: { type: String, trim: true, maxlength: 1_000 },
    },
    schemaVersion: { type: Number, enum: [POLICY_SCHEMA_VERSION], default: POLICY_SCHEMA_VERSION },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

policySchema.index(
  { organizationId: 1, stablePolicyId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_policy_version' },
);
policySchema.index({ organizationId: 1, status: 1, priority: -1, stablePolicyId: 1, version: 1 });
policySchema.index({ organizationId: 1, workspaceId: 1, status: 1, priority: -1 });
policySchema.index({ organizationId: 1, stablePolicyId: 1, createdAt: -1 });
policySchema.index(
  { organizationId: 1, stablePolicyId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
    name: 'one_active_version_per_tenant_policy',
  },
);

policySchema.pre('save', function immutableActivatedPolicy(next) {
  if (!this.isNew && this.isModified() && this.$locals.originalStatus === 'ACTIVE') {
    return next(new Error('Activated policy versions are immutable.'));
  }
  return next();
});

policySchema.post('init', function rememberStatus(document) {
  document.$locals.originalStatus = document.status;
});

module.exports = mongoose.models.Policy || mongoose.model('Policy', policySchema);
