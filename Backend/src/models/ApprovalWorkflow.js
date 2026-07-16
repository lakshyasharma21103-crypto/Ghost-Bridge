const mongoose = require('mongoose');
const {
  APPROVAL_WORKFLOW_STATUSES,
  COMPLIANCE_SCHEMA_VERSION,
  MAX_APPROVAL_STAGES,
  MAX_APPROVERS_PER_STAGE,
} = require('../constants/compliance');

const eligibleApproverSchema = new mongoose.Schema(
  {
    permissionIds: { type: [String], default: undefined },
    roleIds: { type: [String], default: undefined },
    roleKeys: { type: [String], default: undefined },
    teamIds: { type: [String], default: undefined },
    requireOrganizationMembership: { type: Boolean, default: true },
    requireWorkspaceMembership: { type: Boolean, default: true },
    requireHuman: { type: Boolean, default: true },
    requireResourceOwnership: { type: Boolean, default: false },
  },
  { _id: false, strict: 'throw' },
);

const approvalStageSchema = new mongoose.Schema(
  {
    stageId: { type: String, required: true, trim: true, maxlength: 128 },
    sequence: { type: Number, required: true, min: 1, max: MAX_APPROVAL_STAGES },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1_000 },
    requiredDecisionCount: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_APPROVERS_PER_STAGE,
    },
    eligibleApprovers: { type: eligibleApproverSchema, default: () => ({}) },
    distinctApprovers: { type: Boolean, default: true },
    excludeRequester: { type: Boolean, default: true },
    excludePreviousStageApprovers: { type: Boolean, default: false },
    timeoutMs: { type: Number, min: 1_000, max: 7 * 24 * 60 * 60 * 1000 },
    rejectionBehavior: { type: String, enum: ['REJECT_REQUEST'], default: 'REJECT_REQUEST' },
  },
  { _id: false, strict: 'throw' },
);

const approvalTargetSchema = new mongoose.Schema(
  {
    permissionIds: { type: [String], default: undefined },
    resourceTypes: { type: [String], default: undefined },
    resourceIds: { type: [String], default: undefined },
    organizationIds: { type: [String], default: undefined },
    workspaceIds: { type: [String], default: undefined },
    environments: { type: [String], default: undefined },
    passportIds: { type: [String], default: undefined },
    connectionIds: { type: [String], default: undefined },
    capabilityIds: { type: [String], default: undefined },
    capabilityClassifications: { type: [String], default: undefined },
    capabilityCategories: { type: [String], default: undefined },
    sideEffects: { type: [String], default: undefined },
    operationTypes: { type: [String], default: undefined },
  },
  { _id: false, strict: 'throw' },
);

const approvalWorkflowSchema = new mongoose.Schema(
  {
    stableWorkflowId: { type: String, required: true, trim: true, maxlength: 128 },
    version: { type: Number, required: true, min: 1 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 2_000 },
    status: {
      type: String,
      enum: APPROVAL_WORKFLOW_STATUSES,
      default: 'DRAFT',
      required: true,
      index: true,
    },
    target: { type: approvalTargetSchema, default: () => ({}) },
    triggerConditions: { type: mongoose.Schema.Types.Mixed, default: {} },
    stages: {
      type: [approvalStageSchema],
      required: true,
      validate: {
        validator: (value) => value.length >= 1 && value.length <= MAX_APPROVAL_STAGES,
        message: `stages must contain between 1 and ${MAX_APPROVAL_STAGES} entries`,
      },
    },
    expirationMs: { type: Number, required: true, min: 1_000, max: 7 * 24 * 60 * 60 * 1000 },
    escalation: { type: mongoose.Schema.Types.Mixed, default: {} },
    singleUseGrant: { type: Boolean, default: true },
    invalidateWhenRetired: { type: Boolean, default: true },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    schemaVersion: { type: Number, enum: [COMPLIANCE_SCHEMA_VERSION], default: 1 },
    revision: { type: Number, default: 0, min: 0 },
    revisionMetadata: {
      parentVersion: { type: Number, min: 1 },
      changeSummary: { type: String, trim: true, maxlength: 1_000 },
    },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

approvalWorkflowSchema.index(
  { organizationId: 1, stableWorkflowId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_approval_workflow_version' },
);
approvalWorkflowSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
approvalWorkflowSchema.index({ organizationId: 1, status: 1, 'target.permissionIds': 1 });
approvalWorkflowSchema.index(
  { organizationId: 1, stableWorkflowId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
    name: 'one_active_approval_workflow_version',
  },
);

approvalWorkflowSchema.post('init', function rememberStatus(document) {
  document.$locals.originalStatus = document.status;
});
approvalWorkflowSchema.pre('save', function immutableActive(next) {
  if (!this.isNew && this.$locals.originalStatus === 'ACTIVE' && this.isModified()) {
    return next(new Error('Activated approval workflow versions are immutable.'));
  }
  return next();
});

module.exports =
  mongoose.models.ApprovalWorkflow || mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
